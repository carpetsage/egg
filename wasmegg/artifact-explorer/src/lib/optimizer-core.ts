// Outer search for the Path of Virtue optimizer. See OPTIMIZER.md for the
// objective, the tangent relaxation, and the search structure.

import type { LaunchOption, LaunchSolution, OptimizerSolution, RecipeDAG, SlotSummary } from './types';
import { ei } from 'lib';
import {
  alphaToProb,
  compileJointInnerLp,
  JointInnerLp,
  JOINT_TANGENTS,
  EPIGRAPH_SHIFT,
  refineJointCraftSplit,
} from './value-function';
import { solveLp } from './lp';
import { packWitness } from './packing';

const NUM_SLOTS = 3;
const TRIPLE_TOP_K = 20;
const DEFAULT_EPSILON = 1e-3;
const ZERO_TOL = 1e-9;

// Round cap on the pack phase's two shrink loops (fuel cap, then cheapest-loss
// removal), after which packAndFill falls back to best-fit-decreasing. Each
// round costs one evalScoreAt per distinct option plus one packWitness, so the
// cap bounds the phase at ~24 * |distinct| evals — the same order as a single
// pairwise scan. Allocations needing more than 24 removals to become packable
// are far enough from the packable optimum that the cheapest-loss ordering has
// stopped being worth its cost, and BFD is the honest fallback there.
const PACK_SHRINK_MAX_ROUNDS = 24;

// Compute budget for the lattice scans, and *only* a compute budget: the
// options ranked out of it are NOT claimed epsilon-irrelevant. The pairwise
// scan is O(n^2) ternary searches over this set, so it is what the number
// actually bounds; on the widest instances the certificate prune below leaves
// ~240 survivors, where an uncapped scan costs ~23s. Options excluded here stay
// reachable through repairAlloc (full option list) and through polish's
// candidate set, which is why capping is safe where pruning was not.
const SCAN_MAX_SURVIVORS = 12;
// Same idea one order up, and it needs its own number because a triple costs
// ~40x a pair (two nested ternary searches instead of one) on top of growing as
// n^3. Measured best-of-9 on tachyon-deflector-4: widening the triple set from
// 4 to 5 costs +98ms, about what doubling the pairwise set from 12 to 24 costs
// (+115ms), so the two scans cannot share a width. TRIPLE_TOP_K still orders
// the set; this bounds it.
const SCAN_MAX_TRIPLE = 4;

// Ablation switch for the packable-space polish stage. Kept as a single
// module-scope literal so a measurement harness can flip it mechanically.
const POLISH_ENABLED = true;

// Polish budget. The exchange pass is the expensive one at
// O(|alloc| * POLISH_MAX_CANDIDATES) scored trials, so the candidate list is
// capped rather than the option list scanned. POLISH_TOP_ALONE is how many
// solo-scoring options feed that list before the dual-filtered ones do.
const POLISH_MAX_CANDIDATES = 20;
const POLISH_TOP_ALONE = 12;
const POLISH_MAX_DEPTH = 4;
const POLISH_BUDGET_MS = 15;
// Beam width. 1 would be plain best-improvement hill-climbing, which measurably
// cannot cross the one-step valleys these instances have (see polish()).
const POLISH_BEAM_WIDTH = 4;
// Pack tests per level. Successors are tested in descending score order and the
// level stops at POLISH_BEAM_WIDTH survivors, so this only binds when a long
// high-scoring prefix turns out to be unpackable.
const POLISH_MAX_PACK_TRIALS = 12;
// Deliberately far below packWitness's default: polish runs inside a wall-clock
// budget and treats an undecided instance as a rejection, so a cheap "don't
// know" is worth more here than a slow exact answer.
const POLISH_PACK_NODE_BUDGET = 20_000;

interface OptimizeArgs {
  options: LaunchOption[];
  recipeDag: RecipeDAG;
  desiredArtifactNodeIds: string[];
  fuelCapacity: number;
  timeCapacity: number;
  baseYield: Map<string, number>;
  epsilon?: number;
}

type EvalFn = (multipliers: ReadonlyArray<readonly [number, number]>) => number;

interface EvalContext {
  options: LaunchOption[];
  recipeDag: RecipeDAG;
  targets: string[];
  baseYield: Map<string, number>;
  QByTarget: Map<string, number>;
  innerLp: JointInnerLp;
  evalScoreAt: EvalFn; // returns the tangent-approximated F, not a probability
  baseScore: number;
}

interface CoreResult {
  bestAlloc: Map<number, number>;
  bestScore: number;
  // LP relaxation value: an upper bound on F. Infinity when the relaxation did
  // not certify optimality, so a non-converged solve cannot suppress escalation.
  U: number;
  support: Set<number>; // options with positive weight at the LP optimum
  // Polish's recovery path: options the epsilon-certificate prune removed, best
  // solo score first. The certificate is sound, but it is measured against the
  // incumbent at LP time, which later stages improve on; keeping the discards
  // addressable here costs nothing and makes the prune recoverable.
  dualPruned: number[];
  topAlone: number[]; // survivors ranked by scoreAlone, descending
}

interface PackResult {
  alloc: Map<number, number>;
  slots: SlotSummary[];
  score: number;
}

interface SearchContext {
  options: LaunchOption[];
  evalScoreAt: EvalFn;
}
interface SearchResult {
  support: Set<number>;
}

// Relative shortfall in probability space, 1 - e^(best - upper). Gaps on F
// itself are meaningless: F is a log-probability and always <= 0.
function relativeProbGap(upper: number, best: number): number {
  if (!(upper > -Infinity) || !(best > -Infinity)) return 1;
  return -Math.expm1(Math.min(0, best - upper));
}

function buildEvalContext(
  options: LaunchOption[],
  recipeDag: RecipeDAG,
  desiredArtifactNodeIds: string[],
  baseYield: Map<string, number>
): EvalContext {
  const targets = desiredArtifactNodeIds;
  const QByTarget = new Map<string, number>();
  for (const t of targets) {
    const pCraft = recipeDag.get(t)?.legendaryCraftProbability ?? 0;
    QByTarget.set(t, pCraft <= 0 ? 0 : pCraft >= 1 ? 1e6 : -Math.log(1 - pCraft));
  }

  const innerLp = compileJointInnerLp(recipeDag, targets, QByTarget);

  // Preindexed to constraint rows: yields to nodes without a conservation row
  // cannot affect the score.
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
  // Per-target legendary rate, in `targets` order; never pooled into a scalar.
  const optLegRates: Float64Array[] = new Array(options.length);
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
    const legRates = new Float64Array(targets.length);
    for (let ti = 0; ti < targets.length; ti++) {
      legRates[ti] = options[i].legendaryYieldVector.get(targets[ti]) ?? 0;
    }
    optLegRates[i] = legRates;
  }

  const bEval = new Float64Array(nRows);
  const lambdaEval = new Float64Array(targets.length);

  const MAX_EVAL_CACHE = 200_000;
  const evalCache = new Map<string, number>();
  const keyPairs: [number, number][] = [];

  const evalScoreAt: EvalFn = multipliers => {
    // The sort is load-bearing: callers pass the same allocation in different
    // orders, and an unsorted key would miss the cache on every one of them.
    keyPairs.length = 0;
    for (const [idx, k] of multipliers) {
      if (k <= 0) continue;
      keyPairs.push([idx, k]);
    }
    keyPairs.sort((a, b) => a[0] - b[0]);
    let key = '';
    for (const [idx, k] of keyPairs) {
      key += idx + ':' + k + ',';
    }
    const cached = evalCache.get(key);
    if (cached !== undefined) return cached;

    bEval.set(bBase);
    lambdaEval.fill(0);
    for (const [idx, k] of keyPairs) {
      const rows = optYieldRows[idx];
      const rates = optYieldRates[idx];
      for (let j = 0; j < rows.length; j++) {
        bEval[rows[j]] += k * rates[j];
      }
      const legRates = optLegRates[idx];
      for (let ti = 0; ti < legRates.length; ti++) {
        lambdaEval[ti] += k * legRates[ti];
      }
    }
    const score = innerLp.solveScore(bEval, lambdaEval);
    if (evalCache.size >= MAX_EVAL_CACHE) evalCache.clear();
    evalCache.set(key, score);
    return score;
  };

  const baseScore = innerLp.solveScore(bBase, new Float64Array(targets.length));

  return { options, recipeDag, targets, baseYield, QByTarget, innerLp, evalScoreAt, baseScore };
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

  // An empty input field upstream arrives as NaN; clamp before it reaches the
  // comparisons in the scans.
  const R = Number.isFinite(rawR) && rawR > 0 ? rawR : 0;
  const S = Number.isFinite(rawS) && rawS > 0 ? rawS : 0;

  // Filtering unfittable missions here is also what keeps the 3S relaxation's
  // upper bound valid.
  const feasibleOptions = options.filter(o => o.actualTime > ZERO_TOL && o.actualTime <= S);

  const ctx = buildEvalContext(feasibleOptions, recipeDag, desiredArtifactNodeIds, baseYield);

  let bestAlloc = new Map<number, number>();
  let bestScore = ctx.baseScore;
  let bestSlots: SlotSummary[] = [];
  let U = ctx.baseScore;

  if (feasibleOptions.length > 0 && S > 0) {
    // Relaxed solve over 3S aggregate time: may not be 3-bin packable.
    const relaxed = coreSearch(ctx, R, NUM_SLOTS * S, epsilon);
    U = Math.max(U, relaxed.U);

    // Floor solve: three identical single-slot plans, always packable.
    const floor = coreSearch(ctx, R / NUM_SLOTS, S, epsilon);
    const floorAlloc = new Map<number, number>();
    for (const [i, k] of floor.bestAlloc) floorAlloc.set(i, k * NUM_SLOTS);

    // All three fill from the full option list, re-admitting dual-filtered
    // budget-fillers.
    const candidates = [
      packAndFill(relaxed.bestAlloc, ctx, R, S),
      packAndFill(floorAlloc, ctx, R, S),
      packAndFill(new Map(), ctx, R, S),
    ];
    for (const cand of candidates) {
      if (cand.score > bestScore + ZERO_TOL) {
        bestScore = cand.score;
        bestAlloc = cand.alloc;
        bestSlots = cand.slots;
      }
    }

    const polishCandidates = POLISH_ENABLED ? buildPolishCandidates([relaxed, floor]) : [];
    if (POLISH_ENABLED) {
      const p = polish({ alloc: bestAlloc, slots: bestSlots, score: bestScore }, ctx, R, S, polishCandidates);
      if (p.score > bestScore + ZERO_TOL) {
        bestScore = p.score;
        bestAlloc = p.alloc;
        bestSlots = p.slots;
      }
    }

    if (relativeProbGap(U, bestScore) > epsilon) {
      let escalated = escalatePacking(relaxed, floor, ctx, R, S);
      // escalatePacking fills from the LP support only, so options outside it
      // cannot enter there at all; polishing its result against the full
      // candidate list is what re-admits them.
      if (escalated && POLISH_ENABLED) {
        escalated = polish(escalated, ctx, R, S, polishCandidates);
      }
      if (escalated && escalated.score > bestScore + ZERO_TOL) {
        bestScore = escalated.score;
        bestAlloc = escalated.alloc;
        bestSlots = escalated.slots;
      }
    }
  }

  return assembleFullSolution(ctx, bestAlloc, bestSlots, baseYield, desiredArtifactNodeIds, recipeDag);
}

// Single-time-budget integer search. The caller decides whether S is 3S
// (relaxed) or S (floor).
function coreSearch(ctx: EvalContext, R: number, S: number, epsilon: number): CoreResult {
  const { options, evalScoreAt, baseScore, innerLp, baseYield, targets, recipeDag, QByTarget } = ctx;

  let bestScore = baseScore;
  let bestAlloc: Map<number, number> = new Map();

  const tryUpdateAllocations = (score: number, alloc: Map<number, number>) => {
    if (score > bestScore + ZERO_TOL) {
      bestScore = score;
      bestAlloc = alloc;
    }
  };

  const survives = new Uint8Array(options.length);
  for (let i = 0; i < options.length; i++) survives[i] = 1;

  const targetSet = new Set(targets);
  for (let i = 0; i < options.length; i++) {
    if (!survives[i]) continue;
    for (let j = 0; j < options.length; j++) {
      if (i === j || !survives[j]) continue;
      if (dominates(options[j], options[i], targetSet)) {
        survives[i] = 0;
        break;
      }
    }
  }

  const allSurvivors: number[] = [];
  for (let i = 0; i < options.length; i++) {
    if (survives[i]) allSurvivors.push(i);
  }

  // Single-option sweep; scoreAlone feeds the triple scan's top-K ranking.
  const scoreAlone = new Float64Array(options.length).fill(-Infinity);
  for (const idx of allSurvivors) {
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
    tryUpdateAllocations(a, new Map([[idx, k_i]]));
  }

  const lp = solveRelaxationLp(allSurvivors, options, innerLp, R, S, baseYield, targets, recipeDag, QByTarget);
  const lpSupport = new Set<number>(lp.support);

  // Reduced cost per non-support survivor. Support options sit at 0 by
  // complementary slackness, which is also the maximum, so they rank first
  // wherever this array is used as a ranking key.
  const reducedCost = new Float64Array(options.length);
  for (const i of allSurvivors) {
    if (lpSupport.has(i)) continue;
    const opt = options[i];
    let rc = 0;
    for (const [t, dt] of lp.legendaryDuals) {
      if (dt === 0) continue;
      const lv = opt.legendaryYieldVector.get(t);
      if (lv) rc += lv * dt;
    }
    for (const [n, dn] of lp.nodeDuals) {
      if (dn === 0) continue;
      const v = opt.yieldVector.get(n);
      if (v) rc += v * dn;
    }
    rc -= opt.actualFuel * lp.dualR;
    rc -= opt.actualTime * lp.dualS;
    reducedCost[i] = rc;
  }

  // Epsilon-certificate prune. For a non-basic option with rc <= 0, LP
  // sensitivity bounds the relaxation's value under x_i >= 1 by lp.F + rc, and
  // IP <= LP carries that to the integer problem; so if lp.F + rc cannot beat
  // the *incumbent* by more than epsilon, no plan containing i can either.
  //
  // The reference point is the whole point. Charging the loss against lp.F
  // instead — as this filter did until Fix D — asserts epsilon-irrelevance
  // relative to the relaxation, which says nothing about the integer optimum
  // whenever the integrality gap exceeds epsilon. That is the regime these
  // instances live in, and it cost 9 misses over the S5 subset. The old
  // kAlone multiplier is gone with it: the diagnosis measured that charging
  // the bound at a single unit still pruned every needed option, so the
  // multiplier was never the operative error.
  const dualPruned: number[] = [];
  if (lp.certified) {
    for (const i of allSurvivors) {
      if (lpSupport.has(i)) continue;
      const rc = reducedCost[i];
      if (!(rc <= 0)) continue; // no valid sensitivity bound; keep it
      if (relativeProbGap(lp.F + rc, bestScore) <= epsilon) {
        survives[i] = 0;
        dualPruned.push(i);
      }
    }
  }

  const survivorsAfter = allSurvivors.filter(i => survives[i]);

  // Rankings handed to polish. Sorts over the survivor list, no extra
  // evaluations: everything here was already computed by the sweep above.
  const byAlone = (x: number, y: number) => {
    const a = scoreAlone[x];
    const b = scoreAlone[y];
    return a === b ? 0 : b > a ? 1 : -1;
  };
  const topAlone = survivorsAfter.filter(i => scoreAlone[i] > -Infinity).sort(byAlone).slice(0, POLISH_TOP_ALONE);
  dualPruned.sort(byAlone);
  dualPruned.length = Math.min(dualPruned.length, POLISH_MAX_CANDIDATES);

  // Compute budget, not a correctness claim. The certificate above only removes
  // options that provably cannot matter; this cap removes options that merely
  // rank low on the LP's own bound, purely to keep the O(n^2) pairwise and
  // O(n^3) triple scans tractable. Nothing downstream may assume an option
  // dropped here is irrelevant — repairAlloc scans the full option list and
  // polish's candidate set is built from survivorsAfter, so both can still
  // reach them.
  const scanSurvivors =
    survivorsAfter.length <= SCAN_MAX_SURVIVORS
      ? survivorsAfter
      : survivorsAfter
          .slice()
          .sort((x, y) => (reducedCost[x] === reducedCost[y] ? byAlone(x, y) : reducedCost[y] - reducedCost[x]))
          .slice(0, SCAN_MAX_SURVIVORS);

  for (let a = 0; a < scanSurvivors.length; a++) {
    for (let b = a + 1; b < scanSurvivors.length; b++) {
      pairwiseScan(scanSurvivors[a], scanSurvivors[b], options, R, S, evalScoreAt, tryUpdateAllocations);
    }
  }

  // Triples only if the gap is still wide. LP support is ranked ahead of the
  // solo top-K: complementary options score poorly alone but belong here.
  if (relativeProbGap(lp.F, bestScore) > epsilon) {
    const bySingle = scanSurvivors
      .filter(i => isFinite(scoreAlone[i]) && scoreAlone[i] > -Infinity)
      .sort(byAlone)
      .slice(0, TRIPLE_TOP_K);
    const ranked = [...lpSupport].filter(i => survives[i]);
    const seen = new Set(ranked);
    for (const i of bySingle) {
      if (!seen.has(i)) {
        seen.add(i);
        ranked.push(i);
      }
    }
    ranked.length = Math.min(ranked.length, TRIPLE_TOP_K + lpSupport.size, SCAN_MAX_TRIPLE);
    for (let a = 0; a < ranked.length; a++) {
      for (let b = a + 1; b < ranked.length; b++) {
        for (let c = b + 1; c < ranked.length; c++) {
          tripleScan(ranked[a], ranked[b], ranked[c], options, R, S, evalScoreAt, tryUpdateAllocations);
        }
      }
    }
  }

  bestScore = repairAlloc(bestAlloc, bestScore, options, R, S, evalScoreAt);

  // Repair again from the floor-rounded LP solution, keeping the better start.
  const lpRounded = new Map<number, number>();
  for (let s = 0; s < allSurvivors.length; s++) {
    const k = Math.floor(lp.x[s]);
    if (k > 0) lpRounded.set(allSurvivors[s], k);
  }
  let lpRoundedScore = evalScoreAt([...lpRounded]);
  lpRoundedScore = repairAlloc(lpRounded, lpRoundedScore, options, R, S, evalScoreAt);
  if (lpRoundedScore > bestScore + ZERO_TOL) {
    bestScore = lpRoundedScore;
    bestAlloc = lpRounded;
  }

  // An uncertified relaxation is not a bound: report Infinity so the caller's
  // epsilon gate always escalates rather than trusting a non-converged solve.
  return { bestAlloc, bestScore, U: lp.certified ? lp.F : Infinity, support: lpSupport, dualPruned, topAlone };
}

interface PackState {
  alloc: Map<number, number>;
  slotLoad: number[];
  slotRawLoad: number[];
  slotCount: number[];
  usedFuel: number;
}

function emptyPackState(): PackState {
  return {
    alloc: new Map<number, number>(),
    slotLoad: new Array<number>(NUM_SLOTS).fill(0),
    slotRawLoad: new Array<number>(NUM_SLOTS).fill(0),
    slotCount: new Array<number>(NUM_SLOTS).fill(0),
    usedFuel: 0,
  };
}

// The multiset as evalScoreAt wants it, with one copy of `i` removed.
function allocMinusOne(counts: Map<number, number>, i: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [idx, k] of counts) {
    const v = idx === i ? k - 1 : k;
    if (v > 0) out.push([idx, v]);
  }
  return out;
}

// packWitness works over *distinct* durations, so missions are grouped by
// actualTime quantised with Math.round — the same quantisation packing.ts uses
// for its memo keys. The representative duration of a group is its maximum, so
// a witness built against it can never over-fill a slot once the members' real
// durations are summed back in.
function groupByDuration(counts: Map<number, number>, options: LaunchOption[]) {
  const indexByKey = new Map<number, number>();
  const durations: number[] = [];
  const groups: number[][] = [];
  for (const [i, k] of counts) {
    if (k <= 0) continue;
    const d = options[i].actualTime;
    const key = Math.round(d);
    let g = indexByKey.get(key);
    if (g === undefined) {
      g = durations.length;
      indexByKey.set(key, g);
      durations.push(d);
      groups.push([]);
    } else if (d > durations[g]) {
      durations[g] = d;
    }
    for (let c = 0; c < k; c++) groups[g].push(i);
  }
  return { durations, groupCounts: groups.map(g => g.length), groups };
}

function applyWitness(
  groups: number[][],
  witness: number[][],
  options: LaunchOption[],
  usedFuel: number
): PackState {
  const state = emptyPackState();
  state.usedFuel = usedFuel;
  for (let j = 0; j < groups.length; j++) {
    const members = groups[j];
    const w = witness[j];
    for (let m = 0; m < members.length; m++) {
      const i = members[m];
      // The witness assigns slots per duration *group*, so which member of a
      // group lands in which slot is arbitrary; they are taken in mission-
      // enumeration order. That choice only perturbs slotRawLoad (hence the
      // reported runningTimeSeconds), never the score and never feasibility,
      // which depend on actualTime alone.
      const b = w[m];
      state.slotLoad[b] += options[i].actualTime;
      state.slotRawLoad[b] += options[i].rawTime;
      state.slotCount[b] += 1;
      state.alloc.set(i, (state.alloc.get(i) ?? 0) + 1);
    }
  }
  return state;
}

// Exact pack phase: bring the multiset inside the fuel budget, then ask the
// exact 3-bin packer for a witness, shrinking by cheapest-loss removal when the
// multiset provably does not pack. Returns null when the packer could not decide
// (node budget exhausted) or a shrink loop hit PACK_SHRINK_MAX_ROUNDS, in which
// case the caller falls back to best-fit-decreasing.
function exactPackPhase(missionOpt: number[], ctx: SearchContext, R: number, S: number): PackState | null {
  const options = ctx.options;
  if (missionOpt.length === 0) return emptyPackState();

  // Insertion order follows startAlloc, i.e. mission-enumeration order.
  const counts = new Map<number, number>();
  let usedFuel = 0;
  for (const i of missionOpt) {
    counts.set(i, (counts.get(i) ?? 0) + 1);
    usedFuel += options[i].actualFuel;
  }

  let rounds = 0;
  const dropOne = (i: number) => {
    const k = (counts.get(i) ?? 0) - 1;
    if (k > 0) counts.set(i, k);
    else counts.delete(i);
    usedFuel -= options[i].actualFuel;
  };

  // Fuel cap first, by worst score-loss-per-fuel-freed. Guarded so a multiset
  // already inside R costs nothing at all: everything coreSearch produces
  // already respects R, only escalatePacking's one-slot seeds can overshoot.
  if (usedFuel > R + ZERO_TOL) {
    let score = ctx.evalScoreAt([...counts]);
    while (usedFuel > R + ZERO_TOL) {
      if (++rounds > PACK_SHRINK_MAX_ROUNDS) return null;
      let bestI = -1;
      let bestRatio = Infinity;
      let bestScore = -Infinity;
      for (const [i, k] of counts) {
        if (k <= 0) continue;
        const f = options[i].actualFuel;
        if (f <= ZERO_TOL) continue; // frees no fuel, so dropping it cannot help
        const s = ctx.evalScoreAt(allocMinusOne(counts, i));
        const ratio = (score - s) / f;
        if (bestI === -1 || ratio < bestRatio) {
          bestI = i;
          bestRatio = ratio;
          bestScore = s;
        }
      }
      if (bestI === -1) return null;
      dropOne(bestI);
      score = bestScore;
    }
  }

  for (;;) {
    const g = groupByDuration(counts, options);
    const witness = packWitness(g.durations, g.groupCounts, S);
    if (witness === undefined) return null; // node budget exhausted
    if (witness) return applyWitness(g.groups, witness, options, usedFuel);

    // Provably unpackable: drop the single mission whose removal costs the least
    // score, then re-test. Candidates are the distinct options in the alloc, not
    // every individual mission.
    if (++rounds > PACK_SHRINK_MAX_ROUNDS) return null;
    let bestI = -1;
    let bestScore = -Infinity;
    for (const [i, k] of counts) {
      if (k <= 0) continue;
      const s = ctx.evalScoreAt(allocMinusOne(counts, i));
      if (bestI === -1 || s > bestScore) {
        bestI = i;
        bestScore = s;
      }
    }
    if (bestI === -1) return emptyPackState(); // nothing left to drop
    dropOne(bestI);
  }
}

// Turn a (possibly unpackable) allocation into a realizable plan: pack the three
// slots exactly where the packer can decide it, shrinking by cheapest-loss
// removal rather than by whatever a longest-first pass happens to strand, then
// greedily fill.
function packAndFill(
  startAlloc: Map<number, number>,
  ctx: SearchContext,
  R: number,
  S: number,
  fillOptions?: Set<number>
): PackResult {
  const options = ctx.options;

  const missionOpt: number[] = [];
  const missionDur: number[] = [];
  const missionRawDur: number[] = [];
  for (const [i, k] of startAlloc) {
    if (k <= 0) continue;
    const d = options[i].actualTime;
    if (d <= ZERO_TOL || d > S + ZERO_TOL) continue;
    for (let c = 0; c < k; c++) {
      missionOpt.push(i);
      missionDur.push(d);
      missionRawDur.push(options[i].rawTime);
    }
  }

  const packed = exactPackPhase(missionOpt, ctx, R, S);
  const slotLoad = packed ? packed.slotLoad : new Array<number>(NUM_SLOTS).fill(0);
  const slotRawLoad = packed ? packed.slotRawLoad : new Array<number>(NUM_SLOTS).fill(0);
  const slotCount = packed ? packed.slotCount : new Array<number>(NUM_SLOTS).fill(0);
  const alloc = packed ? packed.alloc : new Map<number, number>();
  let usedFuel = packed ? packed.usedFuel : 0;
  if (!packed) {
    // Fallback: best-fit-decreasing, dropping the spillover. Only reached when
    // the exact packer could not decide the instance within its budget.
    const order = missionOpt.map((_, idx) => idx).sort((a, b) => missionDur[b] - missionDur[a]);
    for (const flat of order) {
      const i = missionOpt[flat];
      const d = missionDur[flat];
      const f = options[i].actualFuel;
      if (usedFuel + f > R + ZERO_TOL) continue;
      let best = -1;
      let bestLoad = -1;
      for (let b = 0; b < NUM_SLOTS; b++) {
        if (slotLoad[b] + d <= S + ZERO_TOL && slotLoad[b] > bestLoad) {
          best = b;
          bestLoad = slotLoad[b];
        }
      }
      if (best === -1) continue;
      slotLoad[best] += d;
      slotRawLoad[best] += missionRawDur[flat];
      slotCount[best] += 1;
      alloc.set(i, (alloc.get(i) ?? 0) + 1);
      usedFuel += f;
    }
  }

  let score = evalOf(ctx, alloc);

  const fillList: number[] = [];
  if (fillOptions) {
    const seen = new Set<number>();
    for (const i of fillOptions) {
      if (!seen.has(i)) {
        seen.add(i);
        fillList.push(i);
      }
    }
    for (const i of alloc.keys()) {
      if (!seen.has(i)) {
        seen.add(i);
        fillList.push(i);
      }
    }
  } else {
    for (let i = 0; i < options.length; i++) fillList.push(i);
  }

  // Score is non-decreasing in inventory, so the best add of an option is
  // always its max fitting multiplicity.
  for (;;) {
    let bestAddScore = score;
    let bestOpt = -1;
    let bestSlot = -1;
    let bestCount = 0;
    for (const i of fillList) {
      const o = options[i];
      const d = o.actualTime;
      if (d <= ZERO_TOL || d > S + ZERO_TOL) continue;
      // slot with the most remaining time that can hold at least one
      let slot = -1;
      let bestRem = -1;
      for (let b = 0; b < NUM_SLOTS; b++) {
        const rem = S - slotLoad[b];
        if (rem + ZERO_TOL >= d && rem > bestRem) {
          bestRem = rem;
          slot = b;
        }
      }
      if (slot === -1) continue;
      const fitTime = Math.floor((bestRem + ZERO_TOL) / d);
      const fitFuel = o.actualFuel > ZERO_TOL ? Math.floor((R - usedFuel + ZERO_TOL) / o.actualFuel) : Infinity;
      const add = Math.min(fitTime, fitFuel);
      if (!isFinite(add) || add <= 0) continue;
      const trial = mergeAdd(alloc, i, add);
      const s = ctx.evalScoreAt(trial);
      if (s > bestAddScore + ZERO_TOL) {
        bestAddScore = s;
        bestOpt = i;
        bestSlot = slot;
        bestCount = add;
      }
    }
    if (bestOpt === -1) break;
    alloc.set(bestOpt, (alloc.get(bestOpt) ?? 0) + bestCount);
    usedFuel += bestCount * options[bestOpt].actualFuel;
    slotLoad[bestSlot] += bestCount * options[bestOpt].actualTime;
    slotRawLoad[bestSlot] += bestCount * options[bestOpt].rawTime;
    slotCount[bestSlot] += bestCount;
    score = bestAddScore;
  }

  const slots: SlotSummary[] = slotLoad.map((load, b) => ({
    loadSeconds: load,
    rawLoadSeconds: slotRawLoad[b],
    missionCount: slotCount[b],
  }));
  return { alloc, slots, score };
}

function slotsOf(state: PackState): SlotSummary[] {
  return state.slotLoad.map((load, b) => ({
    loadSeconds: load,
    rawLoadSeconds: state.slotRawLoad[b],
    missionCount: state.slotCount[b],
  }));
}

// Options polish may add. Order is the priority order the cap truncates:
// LP support first (the relaxation's own picks), then the best solo scorers,
// then the epsilon-certificate prune's discards — the route back for an option
// whose LP-sensitivity bound looked irrelevant against a since-improved
// incumbent. topAlone is drawn from the full certificate-survivor list, not the
// scan budget's top slice, so options the scan cap excluded arrive here too.
// Options already in the alloc are added by polish itself and never charged
// against this cap.
function buildPolishCandidates(parts: CoreResult[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (seen.has(i)) return;
    seen.add(i);
    out.push(i);
  };
  for (const p of parts) for (const i of p.support) push(i);
  for (const p of parts) for (const i of p.topAlone) push(i);
  for (const p of parts) for (const i of p.dualPruned) push(i);
  out.length = Math.min(out.length, POLISH_MAX_CANDIDATES);
  return out;
}

// alloc with one copy of `drop` removed and one of `add` inserted; either may be
// -1. Returns null when `drop` is not present.
function allocDelta(alloc: Map<number, number>, drop: number, add: number): Map<number, number> | null {
  const out = new Map(alloc);
  if (drop >= 0) {
    const k = (out.get(drop) ?? 0) - 1;
    if (k < 0) return null;
    if (k === 0) out.delete(drop);
    else out.set(drop, k);
  }
  if (add >= 0) out.set(add, (out.get(add) ?? 0) + 1);
  return out;
}

// Exact 3-bin test for a whole allocation, returning the packed state. A budget
// exhaustion (`undefined`) is treated exactly like a proven failure: polish is a
// local improvement stage, so declining an undecidable move only forgoes a gain.
function packAllocExactly(
  counts: Map<number, number>,
  options: LaunchOption[],
  S: number,
  usedFuel: number
): PackState | null {
  const g = groupByDuration(counts, options);
  const witness = packWitness(g.durations, g.groupCounts, S, POLISH_PACK_NODE_BUDGET);
  if (!witness) return null;
  return applyWitness(g.groups, witness, options, usedFuel);
}

interface PolishNode {
  alloc: Map<number, number>;
  slots: SlotSummary[];
  score: number;
  usedFuel: number;
  usedTime: number;
}

function allocSignature(alloc: Map<number, number>): string {
  const pairs: [number, number][] = [];
  for (const [i, k] of alloc) if (k > 0) pairs.push([i, k]);
  pairs.sort((a, b) => a[0] - b[0]);
  let sig = '';
  for (const [i, k] of pairs) sig += i + ':' + k + ',';
  return sig;
}

// Local search in *packable* space over three move types: +1 of i, -1 of i, and
// the exchange -1 of i / +1 of j. Every stage upstream searches aggregate 3S
// time and then projects into three bins, so it can only add or drop; an
// exchange is unreachable from there even when it is the optimum.
//
// Widened from best-improvement hill-climbing to a width-POLISH_BEAM_WIDTH beam,
// because a pure climb measurably cannot reach the optima this stage exists to
// find. On chunky-knapsack:1089 the incumbent [1,2,0,2] (p=4.503e-4) has *no*
// improving packable neighbour at all — its best is 4.347e-4 — while the optimum
// [2,1,0,3] (p=4.569e-4) sits two moves out, over the intermediate [2,1,0,2]
// (4.133e-4, only the third-best neighbour). One downhill step has to be
// crossed, and the productive one is not the best-scoring one, so both the
// depth and the width are load-bearing. The incumbent is tracked globally, so
// widening can only ever return a better plan than the start.
//
// Cost ordering: evalScoreAt is memoised and cheap on a repeated multiset while
// packWitness is an uncached exact search, so successors are filtered on the two
// budgets, then scored, then pack-tested in descending score order only until
// the level's beam is full.
function polish(start: PackResult, ctx: SearchContext, R: number, S: number, candidates: number[]): PackResult {
  const options = ctx.options;
  const deadline = performance.now() + POLISH_BUDGET_MS;
  const capT = NUM_SLOTS * S;

  const makeNode = (
    alloc: Map<number, number>,
    slots: SlotSummary[],
    score: number,
    usedFuel: number,
    usedTime: number
  ): PolishNode => ({ alloc, slots, score, usedFuel, usedTime });

  let usedFuel0 = 0;
  let usedTime0 = 0;
  for (const [i, k] of start.alloc) {
    usedFuel0 += k * options[i].actualFuel;
    usedTime0 += k * options[i].actualTime;
  }
  const root = makeNode(start.alloc, start.slots, start.score, usedFuel0, usedTime0);

  let incumbent = root;
  let beam: PolishNode[] = [root];
  // Signatures are recorded as successors are *generated*, so a state is
  // enumerated once across the whole search and the beam can never cycle back
  // through the valley it just crossed.
  const visited = new Set<string>([allocSignature(start.alloc)]);

  for (let depth = 0; depth < POLISH_MAX_DEPTH && beam.length > 0; depth++) {
    if (performance.now() > deadline) break;

    const successors: { score: number; alloc: Map<number, number>; usedFuel: number; usedTime: number }[] = [];

    for (const node of beam) {
      if (performance.now() > deadline) break;

      // Adds come from the shared candidate list plus whatever this node already
      // holds; drops and the exchange's `i` come from the node's alloc alone.
      const addList: number[] = [];
      const seen = new Set<number>();
      for (const i of node.alloc.keys()) {
        seen.add(i);
        addList.push(i);
      }
      for (const i of candidates) {
        if (!seen.has(i)) {
          seen.add(i);
          addList.push(i);
        }
      }

      const consider = (drop: number, add: number) => {
        const usedF =
          node.usedFuel + (add >= 0 ? options[add].actualFuel : 0) - (drop >= 0 ? options[drop].actualFuel : 0);
        if (usedF > R + ZERO_TOL) return;
        const usedT =
          node.usedTime + (add >= 0 ? options[add].actualTime : 0) - (drop >= 0 ? options[drop].actualTime : 0);
        if (usedT > capT + ZERO_TOL) return; // necessary condition for 3-bin packability
        const alloc = allocDelta(node.alloc, drop, add);
        if (!alloc) return;
        const sig = allocSignature(alloc);
        if (visited.has(sig)) return;
        visited.add(sig);
        successors.push({ score: ctx.evalScoreAt([...alloc]), alloc, usedFuel: usedF, usedTime: usedT });
      };

      for (const j of addList) {
        const d = options[j].actualTime;
        if (d <= ZERO_TOL || d > S + ZERO_TOL) continue;
        consider(-1, j);
      }
      // Score is non-decreasing in inventory, so a bare -1 never improves on its
      // own; it is enumerated because the budget headroom it frees is what the
      // next level spends, which is exactly how 1197's [3,0,10] is escaped.
      for (const i of node.alloc.keys()) consider(i, -1);
      for (const i of node.alloc.keys()) {
        for (const j of addList) {
          if (i === j) continue;
          const d = options[j].actualTime;
          if (d <= ZERO_TOL || d > S + ZERO_TOL) continue;
          consider(i, j);
        }
      }
    }

    if (successors.length === 0) break;
    successors.sort((a, b) => b.score - a.score);

    const next: PolishNode[] = [];
    let packTests = 0;
    for (const s of successors) {
      if (next.length >= POLISH_BEAM_WIDTH || packTests >= POLISH_MAX_PACK_TRIALS) break;
      if (performance.now() > deadline) break;
      packTests++;
      const packed = packAllocExactly(s.alloc, options, S, s.usedFuel);
      if (!packed) continue;
      const n = makeNode(packed.alloc, slotsOf(packed), s.score, s.usedFuel, s.usedTime);
      next.push(n);
      if (n.score > incumbent.score + ZERO_TOL) incumbent = n;
    }
    beam = next;
  }

  return { alloc: incumbent.alloc, slots: incumbent.slots, score: incumbent.score };
}

function mergeAdd(alloc: Map<number, number>, i: number, add: number): [number, number][] {
  const trial: [number, number][] = [];
  let merged = false;
  for (const [idx, k] of alloc) {
    if (idx === i) {
      trial.push([idx, k + add]);
      merged = true;
    } else {
      trial.push([idx, k]);
    }
  }
  if (!merged) trial.push([i, add]);
  return trial;
}

function evalOf(ctx: SearchContext, alloc: Map<number, number>): number {
  return ctx.evalScoreAt([...alloc]);
}

// Seed one slot full of each LP-support option and re-fill the rest, exploring
// per-slot specializations the balanced relaxation misses.
function escalatePacking(
  relaxed: SearchResult,
  floor: SearchResult,
  ctx: SearchContext,
  R: number,
  S: number
): PackResult | null {
  const support = new Set<number>([...relaxed.support, ...floor.support]);
  let best: PackResult | null = null;
  let starts = 0;
  for (const i of support) {
    const d = ctx.options[i].actualTime;
    // Skip before the seed budget is charged: an unfittable option produces no
    // start at all, so counting it would starve the seeds that can.
    if (d <= ZERO_TOL || d > S + ZERO_TOL) continue;
    if (starts++ >= 8) break;
    const seed = new Map<number, number>([[i, Math.floor(S / d)]]);
    const r = packAndFill(seed, ctx, R, S, support);
    if (!best || r.score > best.score) best = r;
  }
  return best;
}

function assembleFullSolution(
  ctx: EvalContext,
  bestAlloc: Map<number, number>,
  bestSlots: SlotSummary[],
  baseYield: Map<string, number>,
  desiredArtifactNodeIds: string[],
  recipeDag: RecipeDAG
): OptimizerSolution {
  const { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, choiceHistory } = assembleSolution(
    baseYield,
    bestAlloc,
    ctx.options
  );

  // wall-clock is the busiest slot's makespan; running time its raw flight time
  const busiest = bestSlots.reduce<SlotSummary | null>(
    (best, s) => (best === null || s.loadSeconds > best.loadSeconds ? s : best),
    null
  );
  const makespan = busiest?.loadSeconds ?? 0;
  const running = busiest?.rawLoadSeconds ?? 0;

  // The tangent-LP split is only a seed: reported numbers must come off the
  // exact objective, never the search's envelope. See OPTIMIZER.md.
  const seedSolve = ctx.innerLp.solve(finalYieldVector, totalLegendary);
  const finalSolve = refineJointCraftSplit(
    recipeDag,
    desiredArtifactNodeIds,
    ctx.QByTarget,
    finalYieldVector,
    totalLegendary,
    seedSolve
  );
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

  // No targets yields 0, not the empty product's 1: nothing was asked for, so
  // nothing is achieved.
  let jointProbability = perTarget.length > 0 ? 1 : 0;
  for (const t of perTarget) jointProbability *= t.bestProbability;

  return {
    bestProbability: primary.bestProbability,
    craftProbability: primary.craftProbability,
    dropProbability: primary.dropProbability,
    expectedCrafts: primary.expectedCrafts,
    fuelUsed: fuelUsed,
    fuelByEgg: fuelByEgg,
    timeUnitsUsed: Math.round(makespan),
    runningTimeSeconds: Math.round(running),
    slots: bestSlots.length > 0 ? bestSlots : undefined,
    choiceHistory: choiceHistory,
    expectedDrops: [], // populated by index.ts
    finalYieldVector: finalYieldVector,
    baseYield: new Map(baseYield),
    recipeDag: recipeDag,
    craftPrimal: finalSolve.primalByNode,
    perTarget: perTarget,
    jointProbability,
  };
}

function assembleSolution(baseYield: Map<string, number>, bestAlloc: Map<number, number>, options: LaunchOption[]) {
  const choiceHistory: LaunchSolution[] = [];
  let fuelUsed = 0;
  const finalYieldVector = new Map<string, number>(baseYield);
  const totalLegendary = new Map<string, number>();
  const fuelByEgg = new Map<ei.Egg, number>();
  for (const [idx, k] of bestAlloc) {
    if (k <= 0) continue;
    const opt = options[idx];
    fuelUsed += k * opt.actualFuel;
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
      numShipsLaunched: k,
      supplyVector: opt.supplyVector,
      legendarySupplyVector: opt.legendaryYieldVector,
    });
  }
  return { finalYieldVector, totalLegendary, fuelUsed, fuelByEgg, choiceHistory };
}

// j dominates i when it costs no more on either budget and yields at least as
// much of everything, strictly better somewhere. Legendary drops are compared
// per target and never pooled; non-target legendaries are ignored entirely.
function dominates(j: LaunchOption, i: LaunchOption, targetSet: Set<string>): boolean {
  if (j.actualFuel > i.actualFuel + ZERO_TOL) return false;
  if (j.actualTime > i.actualTime + ZERO_TOL) return false;
  let strictYield = false;
  for (const [n, vi] of i.yieldVector) {
    const vj = j.yieldVector.get(n) ?? 0;
    if (vj < vi - ZERO_TOL) return false;
    if (vj > vi + ZERO_TOL) strictYield = true;
  }
  // j producing an ingredient i lacks entirely also counts as strict
  for (const [n, vj] of j.yieldVector) {
    if (vj > ZERO_TOL && !i.yieldVector.has(n)) strictYield = true;
  }
  for (const [t, li] of i.legendaryYieldVector) {
    if (!targetSet.has(t)) continue;
    const lj = j.legendaryYieldVector.get(t) ?? 0;
    if (lj < li - ZERO_TOL) return false;
    if (lj > li + ZERO_TOL) strictYield = true;
  }
  for (const [t, lj] of j.legendaryYieldVector) {
    if (!targetSet.has(t)) continue;
    if (lj > ZERO_TOL && !i.legendaryYieldVector.has(t)) strictYield = true;
  }
  const strictCost = j.actualFuel < i.actualFuel - ZERO_TOL || j.actualTime < i.actualTime - ZERO_TOL;
  return strictCost || strictYield;
}

// Greedy repair over the FULL option list, pruned options included. Mutates
// alloc in place.
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
      const s = evalScoreAt(mergeAdd(alloc, i, kFit));
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
// k_j for a fixed pair).
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

// Ternary search over an integer interval. Extra fields returned by the probe
// ride along with the winning result.
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

interface RelaxationResult {
  // False when the simplex did not certify optimality (iteration limit,
  // infeasible, unbounded, or a degenerate empty model). Neither F nor the
  // duals may be relied on for a soundness argument in that case.
  certified: boolean;
  F: number; // objective (tangent shift already removed): an upper bound on F
  x: Float64Array; // multiplicity per surviving option
  support: number[]; // indices into `options` with x > 0
  dualR: number; // fuel budget shadow price
  dualS: number; // slot-time budget shadow price
  nodeDuals: Map<string, number>; // per conservation row, keyed by node id
  // Per target, sum_k y_{T,k} * beta_k over that target's tangent rows.
  legendaryDuals: Map<string, number>;
}

// The outer LP relaxation. Built directly rather than reusing
// compileJointInnerLp's matrix because here lambda_T is a linear combination
// of the option-count variables, not a precomputed constant.
function solveRelaxationLp(
  survivors: number[],
  options: LaunchOption[],
  innerLp: JointInnerLp,
  R: number,
  S: number,
  baseYield: Map<string, number>,
  targets: string[],
  recipeDag: RecipeDAG,
  QByTarget: Map<string, number>
): RelaxationResult {
  const nx = survivors.length;
  const np = innerLp.nonLeafNodes.length;
  const nt = targets.length;
  const totalVars = nx + np + nt;
  const degenerate: RelaxationResult = {
    certified: false,
    F: 0,
    x: new Float64Array(nx),
    support: [],
    dualR: 0,
    dualS: 0,
    nodeDuals: new Map(),
    legendaryDuals: new Map(),
  };
  if (totalVars === 0) return degenerate;
  const zBase = nx + np;

  const c = new Float64Array(totalVars);
  for (let i = 0; i < nt; i++) c[zBase + i] = 1;

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

  // Row order, which the dual extraction below depends on: rows 0/1 are R/S,
  // then one conservation row per consumed node, then the per-target tangents.
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

  for (let ti = 0; ti < nt; ti++) {
    const t = targets[ti];
    const q = QByTarget.get(t) ?? 0;
    const pIdx = innerLp.varIndex.get(t);
    for (let k = 0; k < JOINT_TANGENTS.length; k++) {
      const row = new Float64Array(totalVars);
      row[zBase + ti] = 1;
      if (pIdx !== undefined && q !== 0) row[nx + pIdx] = -JOINT_TANGENTS[k].beta * q;
      for (let s = 0; s < nx; s++) {
        const lv = options[survivors[s]].legendaryYieldVector.get(t) ?? 0;
        if (lv) row[s] -= JOINT_TANGENTS[k].beta * lv;
      }
      A.push(row);
      bArr.push(JOINT_TANGENTS[k].alpha + EPIGRAPH_SHIFT);
    }
  }

  const b = new Float64Array(bArr);
  const result = solveLp(c, A, b);
  // Includes 'iteration-limit': the simplex can exhaust MAX_ITER without
  // converging, and its duals are then meaningless. Reported uncertified so the
  // caller skips the epsilon-certificate prune and still escalates.
  if (result.status !== 'optimal') {
    return { ...degenerate, F: -Infinity };
  }
  const x = new Float64Array(nx);
  const support: number[] = [];
  for (let s = 0; s < nx; s++) {
    x[s] = result.primal[s];
    if (x[s] > ZERO_TOL) support.push(survivors[s]);
  }

  const dualR = result.duals[0];
  const dualS = result.duals[1];
  const nodeDuals = new Map<string, number>();
  for (let r = 0; r < constraintRowNode.length; r++) {
    nodeDuals.set(constraintRowNode[r], result.duals[2 + r]);
  }
  const tangentBase = 2 + constraintRowNode.length;
  const legendaryDuals = new Map<string, number>();
  for (let ti = 0; ti < nt; ti++) {
    let acc = 0;
    for (let k = 0; k < JOINT_TANGENTS.length; k++) {
      acc += result.duals[tangentBase + ti * JOINT_TANGENTS.length + k] * JOINT_TANGENTS[k].beta;
    }
    legendaryDuals.set(targets[ti], acc);
  }

  return {
    certified: true,
    F: result.objective - nt * EPIGRAPH_SHIFT,
    x,
    support,
    dualR,
    dualS,
    nodeDuals,
    legendaryDuals,
  };
}
