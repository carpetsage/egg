// Outer search for the Path of Virtue optimizer: pick integer batch counts
// k_i for each launch option to maximize the chance of the desired legendary,
// under a fuel budget R and a time budget S.
//
// We don't maximize the probability directly. Instead the objective is
//   score = sum_T Q_T * (crafts of T) + direct legendary drops,
// with Q_T = -log(1 - pCraftLegendary_T). The probability is monotone in
// score, and score is concave in inventory (the inner LP value is concave,
// the legendary term is linear), which is what makes the ternary searches,
// dominance pruning, and dual filter below work.

import type { LaunchOption, LaunchSolution, OptimizerSolution, RecipeDAG } from './types';
import { ei } from 'lib';
import { compileInnerLp, alphaToProb, InnerLp } from './value-function';
import { solveLp } from './lp';

const TRIPLE_TOP_K = 20;
const DEFAULT_EPSILON = 1e-3;
const ZERO_TOL = 1e-9;

interface OptimizeArgs {
  options: LaunchOption[];
  recipeDag: RecipeDAG;
  desiredArtifactNodeIds: string[];
  fuelCapacity: number;
  timeCapacity: number;
  baseYield: Map<string, number>;
  epsilon?: number;
}

export function optimizeFull(args: OptimizeArgs): OptimizerSolution {
  const {
    options,
    recipeDag,
    desiredArtifactNodeIds,
    fuelCapacity: rawR,
    timeCapacity: rawS,
    baseYield,
    epsilon = DEFAULT_EPSILON,
  } = args;

  // A NaN or negative budget (e.g. an empty input field upstream) must not
  // reach the search: NaN comparisons silently take different branches in
  // the single sweep, the pairwise/triple scans, and the joint LP, so each
  // path sees a different effective budget. Clamp to zero — no budget, no
  // launches — and let the caller decide how to present invalid input.
  const R = Number.isFinite(rawR) && rawR > 0 ? rawR : 0;
  const S = Number.isFinite(rawS) && rawS > 0 ? rawS : 0;

  // Q_T weights the inner LP's craft objective so a craft of a target with
  // better legendary odds counts for more.
  const targets = desiredArtifactNodeIds;
  const QByTarget = new Map<string, number>();
  for (const t of targets) {
    const pCraft = recipeDag.get(t)?.legendaryCraftProbability ?? 0;
    QByTarget.set(t, pCraft <= 0 ? 0 : pCraft >= 1 ? 1e6 : -Math.log(1 - pCraft));
  }

  const innerLp = compileInnerLp(recipeDag, desiredArtifactNodeIds, QByTarget);

  // score(alloc) = inner weighted craft value + direct legendary drops.
  // Note non-legendary drops of a final target are inert (it has no
  // conservation row), so they never inflate the craft value.
  //
  // The inner LP only sees inventory through its b vector, so the base yield
  // and each option's yield vector are preindexed down to constraint rows
  // here; yields to nodes without a conservation row can't affect the score.
  const nRows = innerLp.constraintNodes.length;
  const rowIdxByNode = new Map<string, number>();

  for (let i = 0; i < nRows; i++) {
    rowIdxByNode.set(innerLp.constraintNodes[i], i);
  }
  const bBase = new Float64Array(nRows);
  for (const [k, v] of baseYield) {
    const row = rowIdxByNode.get(k);
    if (row !== undefined && v > 0) {
      bBase[row] = v;
    }
  }

  const optYieldRows: Int32Array[] = new Array(options.length);
  const optYieldRates: Float64Array[] = new Array(options.length);

  for (let i = 0; i < options.length; i++) {
    const rows: number[] = [];
    const rates: number[] = [];
    for (const [n, r] of options[i].yieldVector) {
      const row = rowIdxByNode.get(n);
      if (row !== undefined) {
        rows.push(row);
        rates.push(r);
      }
    }
    optYieldRows[i] = new Int32Array(rows);
    optYieldRates[i] = new Float64Array(rates);
  }

  const bEval = new Float64Array(nRows);

  const evalScoreAt = (multipliers: ReadonlyArray<readonly [number, number]>): number => {
    bEval.set(bBase);
    let directLegendary = 0;
    for (const [idx, k] of multipliers) {
      if (k <= 0) continue;
      const rows = optYieldRows[idx];
      const rates = optYieldRates[idx];
      for (let j = 0; j < rows.length; j++) {
        bEval[rows[j]] += k * rates[j];
      }
      const opt = options[idx];
      for (const t of targets) {
        directLegendary += k * (opt.legendaryYieldVector.get(t) ?? 0);
      }
    }
    return innerLp.solveScore(bEval) + directLegendary;
  };

  const baseScore = innerLp.solveScore(bBase);

  // Single-option sweep. Also records each option's solo score, which the
  // triple fallback uses for its top-K ranking.
  const scoreAlone = new Float64Array(options.length).fill(-Infinity);
  const kAlone = new Int32Array(options.length);

  let bestScore = baseScore;
  let bestAlloc: Map<number, number> = new Map();

  const tryUpdateAllocations = (score: number, alloc: Map<number, number>) => {
    if (score > bestScore + ZERO_TOL) {
      bestScore = score;
      bestAlloc = alloc;
    }
  };

  for (let idx = 0; idx < options.length; idx++) {
    const o = options[idx];
    const r_i = o.actualFuel;
    const s_i = o.actualTime;
    if (s_i <= 0) continue;
    const k_i_R = r_i > ZERO_TOL ? Math.floor(R / r_i) : Infinity;
    const k_i_S = Math.floor(S / s_i);
    const k_i = Math.min(k_i_R, k_i_S);
    if (!isFinite(k_i) || k_i < 0) continue;
    const a = evalScoreAt([[idx, k_i]]);
    scoreAlone[idx] = a;
    kAlone[idx] = k_i;
    if (a > bestScore + ZERO_TOL) {
      tryUpdateAllocations(a, new Map([[idx, k_i]]));
    }
  }

  // Dominance pruning: j dominates i when it costs no more on either budget
  // and yields at least as much of every ingredient, strictly better
  // somewhere. Comparing yields pointwise (rather than by solo score) keeps
  // complementary options alive — the only good source of some ingredient
  // can't be pruned just because its standalone score is poor.
  const survives = new Uint8Array(options.length);
  for (let i = 0; i < options.length; i++) survives[i] = 1;

  for (let i = 0; i < options.length; i++) {
    if (!survives[i]) continue;
    for (let j = 0; j < options.length; j++) {
      if (i === j || !survives[j]) continue;
      if (dominates(options[j], options[i])) {
        survives[i] = 0;
        break;
      }
    }
  }

  const allSurvivors: number[] = [];
  for (let i = 0; i < options.length; i++) {
    if (survives[i]) {
      allSurvivors.push(i);
    }
  }

  // Joint LP relaxation: upper bound on the score, plus the support set.
  const jointLp = solveJointLp(allSurvivors, options, innerLp, R, S, baseYield, targets, recipeDag, QByTarget);
  const scoreLP = jointLp.score;
  const lpSupport = new Set<number>(jointLp.support);

  // Dual filter: an option's reduced cost at the LP optimum bounds how much
  // score the LP would lose if forced to include it. Drop options where even
  // the solo-max multiplicity would cost more than half the epsilon gap
  // budget. This is deliberately aggressive (it tends to cut the survivor set
  // down to the LP support, which keeps the pair/triple scans fast) and it
  // does discard cheap budget-filler options — the greedy repair at the end
  // re-admits those from the full list.
  if (scoreLP > ZERO_TOL) {
    const lossBudget = 0.5 * epsilon * scoreLP;
    const yR = jointLp.dualR;
    const yS = jointLp.dualS;
    const nodeDuals = jointLp.nodeDuals;
    for (let i = 0; i < options.length; i++) {
      if (!survives[i]) continue;
      if (lpSupport.has(i)) continue;
      const opt = options[i];
      let rc = 0;
      for (const t of targets) rc += opt.legendaryYieldVector.get(t) ?? 0;
      rc -= opt.actualFuel * yR;
      rc -= opt.actualTime * yS;
      for (const [n, dn] of nodeDuals) {
        if (dn === 0) continue;
        const v = opt.yieldVector.get(n);
        if (v) rc += v * dn;
      }
      const k = Math.max(1, kAlone[i]);
      const maxLoss = -rc * k;
      if (maxLoss > lossBudget) survives[i] = 0;
    }
  }

  const survivorsAfter = allSurvivors.filter(i => survives[i]);

  // Pairwise scans: P x P, then Z x P and Z x Z.
  for (let a = 0; a < survivorsAfter.length; a++) {
    for (let b = a + 1; b < survivorsAfter.length; b++) {
      pairwiseScan(survivorsAfter[a], survivorsAfter[b], options, R, S, evalScoreAt, tryUpdateAllocations);
    }
  }

  // If the LP gap is still large, try triples over the LP support plus the
  // top-K options by solo score. The support goes first: complementary
  // options with poor standalone scores live there, and with many
  // near-duplicate missions the solo ranking would otherwise fill up with
  // clones of the best standalone option and crowd them out.
  const gap = scoreLP > ZERO_TOL ? (scoreLP - bestScore) / scoreLP : 0;
  if (gap > epsilon) {
    const bySingle = survivorsAfter
      .filter(i => isFinite(scoreAlone[i]) && scoreAlone[i] > -Infinity)
      .sort((x, y) => scoreAlone[y] - scoreAlone[x])
      .slice(0, TRIPLE_TOP_K);
    const ranked = [...lpSupport].filter(i => survives[i]);
    const seen = new Set(ranked);
    for (const i of bySingle) {
      if (!seen.has(i)) {
        seen.add(i);
        ranked.push(i);
      }
    }
    ranked.length = Math.min(ranked.length, TRIPLE_TOP_K + lpSupport.size);
    for (let a = 0; a < ranked.length; a++) {
      for (let b = a + 1; b < ranked.length; b++) {
        for (let c = b + 1; c < ranked.length; c++) {
          tripleScan(ranked[a], ranked[b], ranked[c], options, R, S, evalScoreAt, tryUpdateAllocations);
        }
      }
    }
  }

  bestScore = repairAlloc(bestAlloc, bestScore, options, R, S, evalScoreAt);

  // Repair again from the floor-rounded LP solution (still feasible, and its
  // neighborhood is where the integer optimum usually lives). Keep whichever
  // start ends up better.
  const lpRounded = new Map<number, number>();
  for (let s = 0; s < allSurvivors.length; s++) {
    const k = Math.floor(jointLp.x[s]);
    if (k > 0) lpRounded.set(allSurvivors[s], k);
  }
  let lpRoundedScore = evalScoreAt([...lpRounded]);
  lpRoundedScore = repairAlloc(lpRounded, lpRoundedScore, options, R, S, evalScoreAt);
  if (lpRoundedScore > bestScore + ZERO_TOL) {
    bestScore = lpRoundedScore;
    bestAlloc = lpRounded;
  }

  // Assemble the solution.
  const { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, timeSecs, choiceHistory } = assembleSolution(
    baseYield,
    bestAlloc,
    options
  );

  // One extra inner-LP solve at the chosen allocation to recover the
  // per-target craftable counts.
  const finalSolve = innerLp.solve(finalYieldVector);
  const perTarget = desiredArtifactNodeIds.map(t => {
    const craftCount =
      finalSolve.craftByTarget.get(t) ?? (recipeDag.get(t)?.isLeaf ? (finalYieldVector.get(t) ?? 0) : 0);
    const p = alphaToProb(craftCount, totalLegendary, [t], recipeDag);
    return { nodeId: t, expectedCrafts: craftCount, ...p };
  });
  const primary = perTarget[0] ?? {
    bestProbability: 0,
    craftProbability: 0,
    dropProbability: 0,
    expectedCrafts: 0,
  };

  return {
    bestProbability: primary.bestProbability,
    craftProbability: primary.craftProbability,
    dropProbability: primary.dropProbability,
    expectedCrafts: primary.expectedCrafts,
    fuelUsed: fuelUsed,
    fuelByEgg: fuelByEgg,
    timeUnitsUsed: Math.round(timeSecs),
    choiceHistory: choiceHistory,
    expectedDrops: [], // populated by index.ts
    finalYieldVector: finalYieldVector,
    baseYield: new Map(baseYield),
    recipeDag: recipeDag,
    craftPrimal: finalSolve.primalByNode,
    perTarget: perTarget,
  };
}

type EvalFn = (multipliers: ReadonlyArray<readonly [number, number]>) => number;

function assembleSolution(baseYield: Map<string, number>, bestAlloc: Map<number, number>, options: LaunchOption[]) {
  const choiceHistory: LaunchSolution[] = [];
  let fuelUsed = 0;
  let timeSecs = 0;
  const finalYieldVector = new Map<string, number>(baseYield);
  const totalLegendary = new Map<string, number>();
  const fuelByEgg = new Map<ei.Egg, number>();
  for (const [idx, k] of bestAlloc) {
    if (k <= 0) continue;
    const opt = options[idx];
    fuelUsed += k * opt.actualFuel;
    timeSecs += k * opt.actualTime;
    for (const [n, r] of opt.yieldVector) {
      finalYieldVector.set(n, (finalYieldVector.get(n) ?? 0) + k * r);
    }
    for (const [n, r] of opt.legendaryYieldVector) {
      totalLegendary.set(n, (totalLegendary.get(n) ?? 0) + k * r);
    }
    for (const [egg, rate] of opt.fuelByEgg) {
      fuelByEgg.set(egg, (fuelByEgg.get(egg) ?? 0) + k * rate);
    }
    choiceHistory.push({
      ship: opt.ship,
      actualFuel: opt.actualFuel,
      actualFuelByEgg: opt.fuelByEgg,
      actualTime: opt.actualTime,
      target: opt.target ?? '',
      targetAfxId: opt.targetAfxId,
      numShipsLaunched: k * 3,
      supplyVector: opt.supplyVector,
      legendarySupplyVector: opt.legendaryYieldVector,
    });
  }
  return { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, timeSecs, choiceHistory };
}

function dominates(j: LaunchOption, i: LaunchOption): boolean {
  const oi = i;
  const oj = j;
  if (oj.actualFuel > oi.actualFuel + ZERO_TOL) return false;
  if (oj.actualTime > oi.actualTime + ZERO_TOL) return false;
  let strictYield = false;
  for (const [n, vi] of oi.yieldVector) {
    const vj = oj.yieldVector.get(n) ?? 0;
    if (vj < vi - ZERO_TOL) return false;
    if (vj > vi + ZERO_TOL) strictYield = true;
  }
  // j producing an ingredient i lacks entirely also counts as strict
  if (!strictYield) {
    for (const [n, vj] of oj.yieldVector) {
      if (vj > ZERO_TOL && !oi.yieldVector.has(n)) {
        strictYield = true;
        break;
      }
    }
  }
  const strictCost = oj.actualFuel < oi.actualFuel - ZERO_TOL || oj.actualTime < oi.actualTime - ZERO_TOL;
  return strictCost || strictYield;
}

// Greedy repair: starting from an allocation, keep adding the best-scoring
// max-fitting batch from the full option list (including pruned options)
// until nothing improves. Score is non-decreasing in inventory, so the best
// add of an option is always its max fitting multiplicity, and each
// accepted add leaves less budget than one batch of that option costs —
// the loop terminates after a handful of rounds. Mutates alloc in place.
function repairAlloc(
  alloc: Map<number, number>,
  score: number,
  options: LaunchOption[],
  R: number,
  S: number,
  evalScoreAt: EvalFn
): number {
  let usedR = 0;
  let usedS = 0;
  for (const [idx, k] of alloc) {
    usedR += k * options[idx].actualFuel;
    usedS += k * options[idx].actualTime;
  }
  for (;;) {
    let bestAddScore = score;
    let bestAdd: [number, number] | null = null;
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (o.actualTime <= 0) continue;
      const remR = R - usedR;
      const remS = S - usedS;
      const kR = o.actualFuel > ZERO_TOL ? Math.floor(remR / o.actualFuel) : Infinity;
      const kS = Math.floor(remS / o.actualTime);
      const kFit = Math.min(kR, kS);
      if (!isFinite(kFit) || kFit <= 0) continue;
      const trial: [number, number][] = [];
      let merged = false;
      for (const [idx, k] of alloc) {
        if (idx === i) {
          trial.push([idx, k + kFit]);
          merged = true;
        } else trial.push([idx, k]);
      }
      if (!merged) trial.push([i, kFit]);
      const s = evalScoreAt(trial);
      if (s > bestAddScore + ZERO_TOL) {
        bestAddScore = s;
        bestAdd = [i, kFit];
      }
    }
    if (!bestAdd) break;
    const [i, kAdd] = bestAdd;
    alloc.set(i, (alloc.get(i) ?? 0) + kAdd);
    usedR += kAdd * options[i].actualFuel;
    usedS += kAdd * options[i].actualTime;
    score = bestAddScore;
  }
  return score;
}

// Scan the (k_i, k_j) lattice with ternary search on k_j (score is concave in
// k_j for a fixed pair). Works for any mix of zero- and positive-fuel options:
// a zero fuel cost just makes the fuel bound infinite, leaving the time bound.
function pairwiseScan(
  iIdx: number,
  jIdx: number,
  options: LaunchOption[],
  R: number,
  S: number,
  evalScore: EvalFn,
  tryUpdate: (score: number, alloc: Map<number, number>) => void
) {
  const oi = options[iIdx];
  const oj = options[jIdx];
  const r_i = oi.actualFuel,
    s_i = oi.actualTime;
  const r_j = oj.actualFuel,
    s_j = oj.actualTime;
  if (s_i <= 0 || s_j <= 0) return;

  const k_j_max_R = r_j > ZERO_TOL ? Math.floor(R / r_j) : Infinity;
  const k_j_max_S = Math.floor(S / s_j);
  const k_j_max = Math.min(k_j_max_R, k_j_max_S);
  if (k_j_max < 0) return;

  // largest k_i that still fits once k_j batches of j are committed
  const kIatJ = (k_j: number): number => {
    const remR = R - k_j * r_j;
    const remS = S - k_j * s_j;
    if (remR < -ZERO_TOL || remS < -ZERO_TOL) return -1;
    const k_i_R = r_i > ZERO_TOL ? Math.floor(remR / r_i) : Infinity;
    const k_i_S = s_i > 0 ? Math.floor(remS / s_i) : 0;
    const k_i = Math.min(k_i_R, k_i_S);
    return k_i < 0 ? 0 : isFinite(k_i) ? k_i : 0;
  };

  const scoreAtKj = (k_j: number): { score: number; k_i: number } => {
    const k_i = kIatJ(k_j);
    if (k_i < 0) return { score: -Infinity, k_i: -1 };
    const score = evalScore([
      [iIdx, k_i],
      [jIdx, k_j],
    ]);
    return { score, k_i };
  };

  const best = ternaryMaxOver(0, k_j_max, scoreAtKj);
  if (best.k_i >= 0 && best.score > -Infinity) {
    const alloc = new Map<number, number>();
    if (best.k_i > 0) alloc.set(iIdx, best.k_i);
    if (best.k > 0) alloc.set(jIdx, best.k);
    tryUpdate(best.score, alloc);
  }
}

// Triple scan: nested ternary search on k_i and k_j, with k_k determined by
// the leftover budget.
function tripleScan(
  iIdx: number,
  jIdx: number,
  kIdx: number,
  options: LaunchOption[],
  R: number,
  S: number,
  evalScore: EvalFn,
  tryUpdate: (score: number, alloc: Map<number, number>) => void
) {
  const oi = options[iIdx];
  const oj = options[jIdx];
  const ok = options[kIdx];
  const r_i = oi.actualFuel,
    s_i = oi.actualTime;
  const r_j = oj.actualFuel,
    s_j = oj.actualTime;
  const r_k = ok.actualFuel,
    s_k = ok.actualTime;
  if (s_i <= 0 || s_j <= 0 || s_k <= 0) return;

  const k_i_max = Math.min(r_i > ZERO_TOL ? Math.floor(R / r_i) : Infinity, Math.floor(S / s_i));
  if (!isFinite(k_i_max) || k_i_max < 0) return;

  const scoreGivenIJ = (k_i: number, k_j: number) => {
    const remR = R - k_i * r_i - k_j * r_j;
    const remS = S - k_i * s_i - k_j * s_j;
    if (remR < -ZERO_TOL || remS < -ZERO_TOL) return { score: -Infinity, k_k: -1 };
    const k_k_R = r_k > ZERO_TOL ? Math.floor(remR / r_k) : Infinity;
    const k_k_S = Math.floor(remS / s_k);
    const k_k = Math.min(k_k_R, k_k_S);
    if (!isFinite(k_k) || k_k < 0) return { score: -Infinity, k_k: -1 };
    const score = evalScore([
      [iIdx, k_i],
      [jIdx, k_j],
      [kIdx, k_k],
    ]);
    return { score, k_k };
  };

  const outerEval = (k_i: number) => {
    const k_j_max = Math.min(
      r_j > ZERO_TOL ? Math.floor((R - k_i * r_i) / r_j) : Infinity,
      Math.floor((S - k_i * s_i) / s_j)
    );
    if (!isFinite(k_j_max) || k_j_max < 0) return { score: -Infinity, k_j: -1, k_k: -1 };
    const inner = ternaryMaxOver(0, k_j_max, k_j => {
      const r = scoreGivenIJ(k_i, k_j);
      return { score: r.score, k_k: r.k_k };
    });
    return { score: inner.score, k_j: inner.k, k_k: inner.k_k };
  };

  const outer = ternaryMaxOver(0, k_i_max, k_i => {
    const o = outerEval(k_i);
    return { score: o.score, k_j: o.k_j, k_k: o.k_k };
  });

  if (outer.score > -Infinity) {
    const alloc = new Map<number, number>();
    if (outer.k > 0) alloc.set(iIdx, outer.k);
    if (outer.k_j > 0) alloc.set(jIdx, outer.k_j);
    if (outer.k_k > 0) alloc.set(kIdx, outer.k_k);
    tryUpdate(outer.score, alloc);
  }
}

// Ternary search over an integer interval for the max of an approximately
// concave function. Extra fields returned by the probe ride along with the
// winning result.
function ternaryMaxOver<E extends Record<string, number>>(
  lo: number,
  hi: number,
  probe: (k: number) => { score: number } & E
): { score: number; k: number } & E {
  if (hi < lo) {
    return { score: -Infinity, k: lo, ...({} as E) };
  }
  let bestK = lo;
  let bestProbe = probe(lo);
  let bestScore = bestProbe.score;
  if (hi !== lo) {
    const ph = probe(hi);
    if (ph.score > bestScore) {
      bestScore = ph.score;
      bestK = hi;
      bestProbe = ph;
    }
  }
  while (hi - lo > 2) {
    const m1 = lo + Math.floor((hi - lo) / 3);
    const m2 = hi - Math.floor((hi - lo) / 3);
    const p1 = probe(m1);
    const p2 = probe(m2);
    if (p1.score > bestScore) {
      bestScore = p1.score;
      bestK = m1;
      bestProbe = p1;
    }
    if (p2.score > bestScore) {
      bestScore = p2.score;
      bestK = m2;
      bestProbe = p2;
    }
    if (p1.score < p2.score) lo = m1 + 1;
    else hi = m2 - 1;
  }
  for (let k = lo; k <= hi; k++) {
    const p = probe(k);
    if (p.score > bestScore) {
      bestScore = p.score;
      bestK = k;
      bestProbe = p;
    }
  }
  return { ...(bestProbe as E), score: bestScore, k: bestK };
}

interface JointLpResult {
  score: number;
  x: Float64Array; // multiplicity per surviving option
  support: number[]; // indices into `options` with x > 0
  dualR: number; // fuel budget shadow price
  dualS: number; // time budget shadow price
  nodeDuals: Map<string, number>; // per conservation row, keyed by node id
}

function solveJointLp(
  survivors: number[],
  options: LaunchOption[],
  innerLp: InnerLp,
  R: number,
  S: number,
  baseYield: Map<string, number>,
  targets: string[],
  recipeDag: RecipeDAG,
  QByTarget: Map<string, number>
): JointLpResult {
  const nx = survivors.length;
  const np = innerLp.nonLeafNodes.length;
  const totalVars = nx + np;
  if (totalVars === 0) {
    return {
      score: 0,
      x: new Float64Array(0),
      support: [],
      dualR: 0,
      dualS: 0,
      nodeDuals: new Map(),
    };
  }

  // Objective: weighted crafts plus each option's direct legendary yield.
  // Ordinary target drops aren't rewarded here — their value flows through
  // the conservation rows.
  const c = new Float64Array(totalVars);
  for (const [t, q] of QByTarget) {
    const tIdx = innerLp.varIndex.get(t);
    if (tIdx !== undefined) c[nx + tIdx] = q;
  }
  for (let s = 0; s < nx; s++) {
    const opt = options[survivors[s]];
    let ci = 0;
    for (const t of targets) ci += opt.legendaryYieldVector.get(t) ?? 0;
    if (ci) c[s] = ci;
  }

  const A: Float64Array[] = [];
  const bArr: number[] = [];

  // budget rows
  const rRow = new Float64Array(totalVars);
  const sRow = new Float64Array(totalVars);
  for (let s = 0; s < nx; s++) {
    rRow[s] = options[survivors[s]].actualFuel;
    sRow[s] = options[survivors[s]].actualTime;
  }
  A.push(rRow);
  bArr.push(R);
  A.push(sRow);
  bArr.push(S);

  // Conservation rows, one per consumed node n:
  //   sum_parents q * p_parent - (p_n if non-leaf) - sum_i x_i * yield_i[n] <= base_yield[n]
  const parentsOf = new Map<string, { parent: string; q: number }[]>();
  for (const [pid, pnode] of recipeDag) {
    if (pnode.isLeaf) continue;
    for (const child of pnode.children) {
      let arr = parentsOf.get(child.nodeId);
      if (!arr) {
        arr = [];
        parentsOf.set(child.nodeId, arr);
      }
      arr.push({ parent: pid, q: child.quantity });
    }
  }

  // remember which row belongs to which node so duals can be mapped back
  const constraintRowNode: string[] = [];
  for (const nodeId of recipeDag.keys()) {
    const parents = parentsOf.get(nodeId);
    if (!parents || parents.length === 0) continue;
    const row = new Float64Array(totalVars);
    for (const { parent, q } of parents) {
      const pIdx = innerLp.varIndex.get(parent);
      if (pIdx !== undefined) row[nx + pIdx] += q;
    }
    const myIdx = innerLp.varIndex.get(nodeId);
    if (myIdx !== undefined) row[nx + myIdx] -= 1;
    for (let s = 0; s < nx; s++) {
      const v = options[survivors[s]].yieldVector.get(nodeId) ?? 0;
      if (v) row[s] -= v;
    }
    A.push(row);
    bArr.push(baseYield.get(nodeId) ?? 0);
    constraintRowNode.push(nodeId);
  }

  const b = new Float64Array(bArr);
  const result = solveLp(c, A, b);
  if (result.status !== 'optimal') {
    return {
      score: 0,
      x: new Float64Array(nx),
      support: [],
      dualR: 0,
      dualS: 0,
      nodeDuals: new Map(),
    };
  }
  const x = new Float64Array(nx);
  const support: number[] = [];
  for (let s = 0; s < nx; s++) {
    x[s] = result.primal[s];
    if (x[s] > ZERO_TOL) support.push(survivors[s]);
  }
  let score = result.objective;
  for (const [t, q] of QByTarget) score += q * (baseYield.get(t) ?? 0);
  const dualR = result.duals[0];
  const dualS = result.duals[1];
  const nodeDuals = new Map<string, number>();
  for (let r = 0; r < constraintRowNode.length; r++) {
    nodeDuals.set(constraintRowNode[r], result.duals[2 + r]);
  }
  return { score, x, support, dualR, dualS, nodeDuals };
}
