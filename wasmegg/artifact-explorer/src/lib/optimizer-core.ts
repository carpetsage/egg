// ============================================================
// Path of Virtue Optimizer — Outer Search
//
// Implements the algorithm from `algorithm_refinement_prompt.md`:
//   Step 1a  Stratify Z (r=0) vs P (r>0)
//   Step 4   Single-action sweep (computed early to also seed
//            dominance pruning and the Step-5 top-K ranking)
//   Step 1b  Dominance pruning  σ_j dominates σ_i when
//            r_j ≤ r_i ∧ s_j ≤ s_i ∧ α_alone_j ≥ α_alone_i
//   Step 2   Joint LP relaxation → α_LP (upper bound) and the ≤2
//            non-zero x_i (the "FW support" — flagged from_fw=true
//            on the output)
//   Step 3   Pairwise P×P scan with concavity-based ternary search
//            in k_j (per OQ7)
//   Step 3b  Z×P and Z×Z scans (R-budget consumed only by the
//            P action, or not at all)
//   Step 5   Gap check; if (α_LP − best)/α_LP > ε, run a triple
//            fallback restricted to the top-K=20 actions by
//            single-action α
//
// All α evaluations share a single compiled inner LP (see
// value-function.ts) and a scratch inventory map to avoid
// per-call allocation in the hot path.
// ============================================================

import type { LaunchOption, LaunchSolution, OptimizerSolution, RecipeDAG } from './types';
import { ei } from 'lib';
import { compileInnerLp, alphaToProb, InnerLp } from './value-function';
import { solveLp } from './lp';

const TRIPLE_TOP_K = 20;
const DEFAULT_EPSILON = 1e-3;
const ZERO_TOL = 1e-9;

interface OptimizeArgs {
  options: LaunchOption[];
  recipe_dag: RecipeDAG;
  desired_artifact_node_ids: string[];
  fuel_capacity: number;
  time_capacity: number;
  base_yield: Map<string, number>;
  epsilon?: number;
}

export function optimizeFull(args: OptimizeArgs): OptimizerSolution {
  const {
    options,
    recipe_dag,
    desired_artifact_node_ids,
    fuel_capacity: R,
    time_capacity: S,
    base_yield,
    epsilon = DEFAULT_EPSILON,
  } = args;

  const innerLp = compileInnerLp(recipe_dag, desired_artifact_node_ids);
  const root = innerLp.root;
  const scratchInv = new Map<string, number>();

  // Direct optimisation of best_probability via the substitution
  //   score(alloc) = q · α(alloc) + Σ k_i · L_i[root]
  //                = −log(1 − best_probability(alloc))
  // where q = −log(1 − p_legendary_per_craft) is constant for the
  // chosen artifact. Maximising score maximises best_probability and
  // is monotone in the budget S, eliminating the objective-mismatch
  // source of probability non-monotonicity. The score is concave in
  // inventory (α is concave; the legendary term is linear), so the
  // ternary search, dominance, and dual filter remain valid.
  const rootNode = recipe_dag.get(root);
  const pCraft = rootNode?.legendaryCraftProbability ?? 0;
  const Q = pCraft <= 0 ? 0 : pCraft >= 1 ? 1e6 : -Math.log(1 - pCraft);

  const evalScoreAt = (multipliers: ReadonlyArray<readonly [number, number]>): number => {
    scratchInv.clear();
    for (const [k, v] of base_yield) scratchInv.set(k, v);
    let directLegendary = 0;
    for (const [idx, k] of multipliers) {
      if (k <= 0) continue;
      const opt = options[idx];
      for (const [n, r] of opt.yield_vector) {
        scratchInv.set(n, (scratchInv.get(n) ?? 0) + k * r);
      }
      directLegendary += k * (opt.legendary_yield_vector.get(root) ?? 0);
    }
    const alpha = innerLp.solve(scratchInv).alpha;
    return Q * alpha + directLegendary;
  };

  const baseScore = (() => {
    scratchInv.clear();
    for (const [k, v] of base_yield) scratchInv.set(k, v);
    return Q * innerLp.solve(scratchInv).alpha;
  })();

  // ------------------------------------------------------------
  // Step 1a — Stratify Z (r=0) vs P (r>0)
  // ------------------------------------------------------------
  const Z: number[] = [];
  const P: number[] = [];
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (o.actual_time <= 0) continue; // degenerate; can't bound by S
    if (o.actual_fuel <= ZERO_TOL) Z.push(i);
    else P.push(i);
  }

  // ------------------------------------------------------------
  // Step 4 (computed first) — single-action sweep
  // Also produces score_alone[i] used by the Step-5 top-K ranking.
  // ------------------------------------------------------------
  const scoreAlone = new Float64Array(options.length).fill(-Infinity);
  const kAlone = new Int32Array(options.length);

  let bestScore = baseScore;
  let bestAlloc: Map<number, number> = new Map();

  const tryUpdate = (score: number, alloc: Map<number, number>) => {
    if (score > bestScore + ZERO_TOL) {
      bestScore = score;
      bestAlloc = new Map(alloc);
    }
  };

  for (let idx = 0; idx < options.length; idx++) {
    const o = options[idx];
    const r_i = o.actual_fuel;
    const s_i = o.actual_time;
    if (s_i <= 0) continue;
    const k_i_R = r_i > ZERO_TOL ? Math.floor(R / r_i) : Infinity;
    const k_i_S = Math.floor(S / s_i);
    const k_i = Math.min(k_i_R, k_i_S);
    if (!isFinite(k_i) || k_i < 0) continue;
    const a = evalScoreAt([[idx, k_i]]);
    scoreAlone[idx] = a;
    kAlone[idx] = k_i;
    if (a > bestScore + ZERO_TOL) {
      tryUpdate(a, new Map([[idx, k_i]]));
    }
  }

  // ------------------------------------------------------------
  // Step 1b — Dominance pruning (pointwise yield variant)
  // σ_i dominated by σ_j iff
  //   r_j ≤ r_i ∧ s_j ≤ s_i ∧ ∀ DAG node n: Δ_j[n] ≥ Δ_i[n]
  // with strict inequality in at least one axis.
  //
  // Pointwise yield dominance preserves complementary actions: an
  // option that is the unique high-rate source of some ingredient n
  // cannot be dominated by any option that yields less of n, even
  // if its scalar α-alone is higher. Scalar dominance (α_alone or
  // efficiency-ratio variants) collapses the yield vector to one
  // number and over-prunes actions whose value comes from filling
  // an ingredient gap in pairs/triples rather than from standalone α.
  // ------------------------------------------------------------
  const survives = new Uint8Array(options.length);
  for (let i = 0; i < options.length; i++) survives[i] = 1;

  const dominates = (j: number, i: number): boolean => {
    const oi = options[i];
    const oj = options[j];
    if (oj.actual_fuel > oi.actual_fuel + ZERO_TOL) return false;
    if (oj.actual_time > oi.actual_time + ZERO_TOL) return false;
    // ∀ n in i's yield: j must produce at least as much.
    let strictYield = false;
    for (const [n, vi] of oi.yield_vector) {
      const vj = oj.yield_vector.get(n) ?? 0;
      if (vj < vi - ZERO_TOL) return false;
      if (vj > vi + ZERO_TOL) strictYield = true;
    }
    // j may also produce ingredients i lacks entirely — that's strict yield.
    if (!strictYield) {
      for (const [n, vj] of oj.yield_vector) {
        if (vj > ZERO_TOL && !oi.yield_vector.has(n)) {
          strictYield = true;
          break;
        }
      }
    }
    const strictCost = oj.actual_fuel < oi.actual_fuel - ZERO_TOL || oj.actual_time < oi.actual_time - ZERO_TOL;
    return strictCost || strictYield;
  };

  const pruneStratum = (stratum: number[]) => {
    for (const i of stratum) {
      if (!survives[i]) continue;
      for (const j of stratum) {
        if (i === j || !survives[j]) continue;
        if (dominates(j, i)) {
          survives[i] = 0;
          break;
        }
      }
    }
  };
  pruneStratum(Z);
  pruneStratum(P);
  // Z-vs-P cross check: Z trivially has r=0 ≤ any r_i, so the same
  // dominates() helper applies — it just trivially passes the R-cost test.
  for (const i of P) {
    if (!survives[i]) continue;
    for (const j of Z) {
      if (!survives[j]) continue;
      if (dominates(j, i)) {
        survives[i] = 0;
        break;
      }
    }
  }

  const Zs = Z.filter(i => survives[i]);
  const Ps = P.filter(i => survives[i]);
  const allSurvivors = Zs.concat(Ps);

  // ------------------------------------------------------------
  // Step 2 — Joint LP relaxation (in score units)
  // ------------------------------------------------------------
  const jointLp = solveJointLp(allSurvivors, options, innerLp, R, S, base_yield, root, recipe_dag, Q);
  const scoreLP = jointLp.score;
  const fwSet = new Set<number>(jointLp.support);

  // ------------------------------------------------------------
  // Step 2b — LP-dual marginal-value filter (score units)
  //
  // At the LP optimum every action's reduced cost is RC_i ≤ 0:
  //   c_i  = Q · Δ_i[root] + L_i[root]
  //   RC_i = c_i + Σ_n Δ_i[n] · y_n − r_i · y_R − s_i · y_S
  // where y_R, y_S are the budget shadow prices and y_n are the
  // ingredient shadow prices on the inner conservation rows. Using
  // action i at multiplicity k_i costs k_i · |RC_i| in score-units —
  // by complementary slackness this is the lower bound on how much
  // score the LP would lose if the integer program were forced to
  // include action i. We drop action i when even at solo-max
  // multiplicity kAlone[i] the loss exceeds half the gap budget
  // τ = 0.5 · ε · score_LP.
  // ------------------------------------------------------------
  if (scoreLP > ZERO_TOL) {
    const lossBudget = 0.5 * epsilon * scoreLP;
    const yR = jointLp.dualR;
    const yS = jointLp.dualS;
    const nodeDuals = jointLp.nodeDuals;
    for (let i = 0; i < options.length; i++) {
      if (!survives[i]) continue;
      if (fwSet.has(i)) continue; // never drop the FW support
      const opt = options[i];
      let rc = Q * (opt.yield_vector.get(root) ?? 0) + (opt.legendary_yield_vector.get(root) ?? 0);
      rc -= opt.actual_fuel * yR;
      rc -= opt.actual_time * yS;
      for (const [n, dn] of nodeDuals) {
        if (dn === 0) continue;
        const v = opt.yield_vector.get(n);
        if (v) rc += v * dn;
      }
      const k = Math.max(1, kAlone[i]);
      const maxLoss = -rc * k;
      if (maxLoss > lossBudget) survives[i] = 0;
    }
  }
  const ZsAfter = Zs.filter(i => survives[i]);
  const PsAfter = Ps.filter(i => survives[i]);

  // ------------------------------------------------------------
  // Step 3 — Pairwise P×P scan
  // ------------------------------------------------------------
  for (let a = 0; a < PsAfter.length; a++) {
    for (let b = a + 1; b < PsAfter.length; b++) {
      pairwiseScan(PsAfter[a], PsAfter[b], options, R, S, evalScoreAt, tryUpdate);
    }
  }

  // ------------------------------------------------------------
  // Step 3b — Z×P and Z×Z scans
  // ------------------------------------------------------------
  for (const i of ZsAfter) {
    for (const j of PsAfter) {
      pairwiseScan(i, j, options, R, S, evalScoreAt, tryUpdate);
    }
  }
  for (let a = 0; a < ZsAfter.length; a++) {
    for (let b = a + 1; b < ZsAfter.length; b++) {
      pairwiseScan(ZsAfter[a], ZsAfter[b], options, R, S, evalScoreAt, tryUpdate);
    }
  }

  // ------------------------------------------------------------
  // Step 5 — Gap check + triple fallback (score units)
  // ------------------------------------------------------------
  const gap = scoreLP > ZERO_TOL ? (scoreLP - bestScore) / scoreLP : 0;
  if (gap > epsilon) {
    // Top-K survivors by score-alone.
    // [ASSUMPTION] Restricting the triple search to the top-K=20 by
    // score-alone keeps the O(K³ · log² S) cost tractable. Triples
    // involving low-score actions rarely improve the joint solution.
    const ranked = ZsAfter.concat(PsAfter)
      .filter(i => isFinite(scoreAlone[i]) && scoreAlone[i] > -Infinity)
      .sort((x, y) => scoreAlone[y] - scoreAlone[x])
      .slice(0, TRIPLE_TOP_K);
    for (let a = 0; a < ranked.length; a++) {
      for (let b = a + 1; b < ranked.length; b++) {
        for (let c = b + 1; c < ranked.length; c++) {
          tripleScan(ranked[a], ranked[b], ranked[c], options, R, S, evalScoreAt, tryUpdate);
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Output assembly
  // ------------------------------------------------------------
  const choice_history: LaunchSolution[] = [];
  let fuel_used = 0;
  let time_secs = 0;
  const final_yield_vector = new Map<string, number>(base_yield);
  const total_legendary = new Map<string, number>();
  const fuel_by_egg = new Map<ei.Egg, number>();
  for (const [idx, k] of bestAlloc) {
    if (k <= 0) continue;
    const opt = options[idx];
    fuel_used += k * opt.actual_fuel;
    time_secs += k * opt.actual_time;
    for (const [n, r] of opt.yield_vector) {
      final_yield_vector.set(n, (final_yield_vector.get(n) ?? 0) + k * r);
    }
    for (const [n, r] of opt.legendary_yield_vector) {
      total_legendary.set(n, (total_legendary.get(n) ?? 0) + k * r);
    }
    for (const [egg, rate] of opt.fuel_by_egg) {
      fuel_by_egg.set(egg, (fuel_by_egg.get(egg) ?? 0) + k * rate);
    }
    choice_history.push({
      ship: opt.ship,
      actual_fuel: opt.actual_fuel,
      actual_fuel_by_egg: opt.fuel_by_egg,
      actual_time: opt.actual_time,
      target: opt.target ?? '',
      targetAfxId: opt.targetAfxId,
      num_ships_launched: k * 3,
      supply_vector: opt.supply_vector,
      legendary_supply_vector: opt.legendary_yield_vector,
    });
  }

  // Root is the target, not an ingredient; its legendary drops flow via
  // legendary_yield_vector → drop_probability. Exclude it so rootDirect = 0
  // and alpha = craft_primal[root], keeping the craft chain consistent.
  final_yield_vector.delete(root);

  // Recover the deterministic α at the chosen integer allocation
  // (one extra inner-LP solve) since alphaToProb takes raw α, not score.
  const finalSolve = innerLp.solve(final_yield_vector);
  const bestAlpha = finalSolve.alpha;
  const probs = alphaToProb(bestAlpha, total_legendary, desired_artifact_node_ids, recipe_dag);

  return {
    best_probability: probs.best_probability,
    craft_probability: probs.craft_probability,
    drop_probability: probs.drop_probability,
    expected_crafts: bestAlpha,
    fuel_used,
    fuel_by_egg,
    time_units_used: Math.round(time_secs),
    choice_history,
    expected_drops: [], // populated by index.ts
    final_yield_vector,
    recipe_dag,
    craft_primal: finalSolve.primalByNode,
  };
}

// ============================================================
// Helpers
// ============================================================

type EvalFn = (multipliers: ReadonlyArray<readonly [number, number]>) => number;

/**
 * Pairwise scan over the (k_i, k_j) lattice with ternary search on
 * k_j (concavity of α* in k_j for fixed Δ_i, Δ_j). Handles all of
 * P×P, Z×P, Z×Z because r=0 collapses k_R upper bound to Infinity
 * which is then clamped against the S-bound.
 */
function pairwiseScan(
  iIdx: number,
  jIdx: number,
  options: LaunchOption[],
  R: number,
  S: number,
  evalAlpha: EvalFn,
  tryUpdate: (alpha: number, alloc: Map<number, number>) => void
) {
  const oi = options[iIdx];
  const oj = options[jIdx];
  const r_i = oi.actual_fuel,
    s_i = oi.actual_time;
  const r_j = oj.actual_fuel,
    s_j = oj.actual_time;
  if (s_i <= 0 || s_j <= 0) return;

  const k_j_max_R = r_j > ZERO_TOL ? Math.floor(R / r_j) : Infinity;
  const k_j_max_S = Math.floor(S / s_j);
  const k_j_max = Math.min(k_j_max_R, k_j_max_S);
  if (!isFinite(k_j_max) && r_i <= ZERO_TOL && r_j <= ZERO_TOL) {
    // Both Z: k_j_max bounded by S only.
  }
  if (k_j_max < 0) return;

  const kIatJ = (k_j: number): number => {
    const remR = R - k_j * r_j;
    const remS = S - k_j * s_j;
    if (remR < -ZERO_TOL || remS < -ZERO_TOL) return -1;
    const k_i_R = r_i > ZERO_TOL ? Math.floor(remR / r_i) : Infinity;
    const k_i_S = s_i > 0 ? Math.floor(remS / s_i) : 0;
    const k_i = Math.min(k_i_R, k_i_S);
    return k_i < 0 ? 0 : isFinite(k_i) ? k_i : 0;
  };

  const eval_k_j = (k_j: number): { alpha: number; k_i: number } => {
    const k_i = kIatJ(k_j);
    if (k_i < 0) return { alpha: -Infinity, k_i: -1 };
    const alpha = evalAlpha([
      [iIdx, k_i],
      [jIdx, k_j],
    ]);
    return { alpha, k_i };
  };

  const best = ternaryMaxOver(0, k_j_max, eval_k_j);
  if (best.k_i >= 0 && best.alpha > -Infinity) {
    const alloc = new Map<number, number>();
    if (best.k_i > 0) alloc.set(iIdx, best.k_i);
    if (best.k > 0) alloc.set(jIdx, best.k);
    tryUpdate(best.alpha, alloc);
  }
}

/**
 * Triple scan with nested ternary search on k_i and k_j, deterministic
 * k_k from remaining budget. Uses the same concavity-of-α* assumption
 * along each axis.
 */
function tripleScan(
  iIdx: number,
  jIdx: number,
  kIdx: number,
  options: LaunchOption[],
  R: number,
  S: number,
  evalAlpha: EvalFn,
  tryUpdate: (alpha: number, alloc: Map<number, number>) => void
) {
  const oi = options[iIdx];
  const oj = options[jIdx];
  const ok = options[kIdx];
  const r_i = oi.actual_fuel,
    s_i = oi.actual_time;
  const r_j = oj.actual_fuel,
    s_j = oj.actual_time;
  const r_k = ok.actual_fuel,
    s_k = ok.actual_time;
  if (s_i <= 0 || s_j <= 0 || s_k <= 0) return;

  const k_i_max = Math.min(r_i > ZERO_TOL ? Math.floor(R / r_i) : Infinity, Math.floor(S / s_i));
  if (!isFinite(k_i_max) || k_i_max < 0) return;

  const evalGivenIJ = (k_i: number, k_j: number) => {
    const remR = R - k_i * r_i - k_j * r_j;
    const remS = S - k_i * s_i - k_j * s_j;
    if (remR < -ZERO_TOL || remS < -ZERO_TOL) return { alpha: -Infinity, k_k: -1 };
    const k_k_R = r_k > ZERO_TOL ? Math.floor(remR / r_k) : Infinity;
    const k_k_S = Math.floor(remS / s_k);
    const k_k = Math.min(k_k_R, k_k_S);
    if (!isFinite(k_k) || k_k < 0) return { alpha: -Infinity, k_k: -1 };
    const alpha = evalAlpha([
      [iIdx, k_i],
      [jIdx, k_j],
      [kIdx, k_k],
    ]);
    return { alpha, k_k };
  };

  // Outer ternary on k_i. For each k_i, an inner ternary on k_j.
  const outerEval = (k_i: number) => {
    const k_j_max = Math.min(
      r_j > ZERO_TOL ? Math.floor((R - k_i * r_i) / r_j) : Infinity,
      Math.floor((S - k_i * s_i) / s_j)
    );
    if (!isFinite(k_j_max) || k_j_max < 0) return { alpha: -Infinity, k_j: -1, k_k: -1 };
    const inner = ternaryMaxOver(0, k_j_max, k_j => {
      const r = evalGivenIJ(k_i, k_j);
      return { alpha: r.alpha, k_k: r.k_k };
    });
    return { alpha: inner.alpha, k_j: inner.k, k_k: inner.k_k };
  };

  const outer = ternaryMaxOver(0, k_i_max, k_i => {
    const o = outerEval(k_i);
    return { alpha: o.alpha, k_j: o.k_j, k_k: o.k_k };
  });

  if (outer.alpha > -Infinity) {
    const alloc = new Map<number, number>();
    if (outer.k > 0) alloc.set(iIdx, outer.k);
    if (outer.k_j > 0) alloc.set(jIdx, outer.k_j);
    if (outer.k_k > 0) alloc.set(kIdx, outer.k_k);
    tryUpdate(outer.alpha, alloc);
  }
}

/**
 * Ternary search over an integer interval for the maximiser of an
 * approximately-concave function. The probe callback returns
 * `{ alpha, ...extra }` and the carried `extra` fields propagate
 * back with the winning probe.
 */
function ternaryMaxOver<E extends Record<string, number>>(
  lo: number,
  hi: number,
  probe: (k: number) => { alpha: number } & E
): { alpha: number; k: number } & E {
  if (hi < lo) {
    return { alpha: -Infinity, k: lo, ...({} as E) };
  }
  let bestK = lo;
  let bestProbe = probe(lo);
  let bestAlpha = bestProbe.alpha;
  if (hi !== lo) {
    const ph = probe(hi);
    if (ph.alpha > bestAlpha) {
      bestAlpha = ph.alpha;
      bestK = hi;
      bestProbe = ph;
    }
  }
  while (hi - lo > 2) {
    const m1 = lo + Math.floor((hi - lo) / 3);
    const m2 = hi - Math.floor((hi - lo) / 3);
    const p1 = probe(m1);
    const p2 = probe(m2);
    if (p1.alpha > bestAlpha) {
      bestAlpha = p1.alpha;
      bestK = m1;
      bestProbe = p1;
    }
    if (p2.alpha > bestAlpha) {
      bestAlpha = p2.alpha;
      bestK = m2;
      bestProbe = p2;
    }
    if (p1.alpha < p2.alpha) lo = m1 + 1;
    else hi = m2 - 1;
  }
  for (let k = lo; k <= hi; k++) {
    const p = probe(k);
    if (p.alpha > bestAlpha) {
      bestAlpha = p.alpha;
      bestK = k;
      bestProbe = p;
    }
  }
  return { ...(bestProbe as E), alpha: bestAlpha, k: bestK };
}

// ============================================================
// Step 2 joint LP (action multipliers x_i + recipe runs p_n)
// ============================================================

interface JointLpResult {
  /** LP optimum value in score units = Q · α + Σ x_i · L_i[root] (+ const). */
  score: number;
  /** x_i for each surviving option. */
  x: Float64Array;
  /** Indices into the original `options` array of FW-support actions (x_i > 0). */
  support: number[];
  /** Shadow price on the R (fuel) budget constraint. */
  dualR: number;
  /** Shadow price on the S (time) budget constraint. */
  dualS: number;
  /** Shadow price per inner conservation row, keyed by node id. */
  nodeDuals: Map<string, number>;
}

function solveJointLp(
  survivors: number[],
  options: LaunchOption[],
  innerLp: InnerLp,
  R: number,
  S: number,
  base_yield: Map<string, number>,
  root: string,
  recipe_dag: RecipeDAG,
  Q: number
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

  // Objective in score units:
  //   max Q · p_root + Σ x_i · (Q · Δ_i[root] + L_i[root])
  const c = new Float64Array(totalVars);
  const rootIdx = innerLp.varIndex.get(root);
  if (rootIdx !== undefined) c[nx + rootIdx] = Q;
  for (let s = 0; s < nx; s++) {
    const opt = options[survivors[s]];
    const dRoot = opt.yield_vector.get(root) ?? 0;
    const lRoot = opt.legendary_yield_vector.get(root) ?? 0;
    const ci = Q * dRoot + lRoot;
    if (ci) c[s] = ci;
  }

  const A: Float64Array[] = [];
  const bArr: number[] = [];

  // Budget rows
  const rRow = new Float64Array(totalVars);
  const sRow = new Float64Array(totalVars);
  for (let s = 0; s < nx; s++) {
    rRow[s] = options[survivors[s]].actual_fuel;
    sRow[s] = options[survivors[s]].actual_time;
  }
  A.push(rRow);
  bArr.push(R);
  A.push(sRow);
  bArr.push(S);

  // Inner conservation constraints: per non-root node n with parents,
  //   Σ_parents q · p_parent − [p_n if non-leaf] − Σ x_i · Δ_i[n] ≤ base_yield[n]
  const parentsOf = new Map<string, { parent: string; q: number }[]>();
  for (const [pid, pnode] of recipe_dag) {
    if (pnode.is_leaf) continue;
    for (const child of pnode.children) {
      let arr = parentsOf.get(child.node_id);
      if (!arr) {
        arr = [];
        parentsOf.set(child.node_id, arr);
      }
      arr.push({ parent: pid, q: child.quantity });
    }
  }

  // Track which constraint row corresponds to which node so we can
  // map duals back by node id after the LP solve.
  const constraintRowNode: string[] = [];
  for (const nodeId of recipe_dag.keys()) {
    if (nodeId === root) continue;
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
      const v = options[survivors[s]].yield_vector.get(nodeId) ?? 0;
      if (v) row[s] -= v;
    }
    A.push(row);
    bArr.push(base_yield.get(nodeId) ?? 0);
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
  const score = result.objective + Q * (base_yield.get(root) ?? 0);
  const dualR = result.duals[0];
  const dualS = result.duals[1];
  const nodeDuals = new Map<string, number>();
  for (let r = 0; r < constraintRowNode.length; r++) {
    nodeDuals.set(constraintRowNode[r], result.duals[2 + r]);
  }
  return { score, x, support, dualR, dualS, nodeDuals };
}
