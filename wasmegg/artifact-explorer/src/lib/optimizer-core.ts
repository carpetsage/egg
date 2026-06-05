// ============================================================
// Path of Virtue Optimizer — Outer Search
//
// Given a set of enumerated launch options, find the integer
// allocation (how many batches of each option to launch) that
// maximises the chance of obtaining the desired legendary artifact,
// subject to a fuel budget and a time budget.
//
// Symbol glossary (terse names are used to keep the formulas below
// readable; this table is the source of truth for what they mean):
//   R          fuel capacity (budget);  r_i = fuel cost of option i
//   S          time capacity (budget);  s_i = time cost of option i
//   k_i        integer multiplicity (number of batches) of option i
//   α (alpha)  expected craftable count of the root artifact for a
//              given inventory — the inner LP's value (value-function.ts)
//   Q_T        −log(1 − p_legendary_per_craft_T); constant for a target T
//   score      Σ_T Q_T·p_T + Σ k_i·(direct legendary yield of the targets).
//              This is the quantity actually maximised here — NOT α. Locals
//              named `score` / `evalScore` hold this composite value.
//   Z          options with zero fuel cost   (r_i = 0)
//   P          options with positive fuel cost (r_i > 0)
//
// Why maximise `score` instead of best_probability directly:
//   best_probability is monotone increasing in `score`, and `score`
//   is concave in inventory (α is concave; the legendary term is
//   linear). Optimising `score` therefore maximises best_probability
//   while keeping the ternary search, dominance pruning, and dual
//   filter valid, and it removes a non-monotonicity that appeared
//   when the probability expression was optimised directly.
//
// Stages (the labels match the section headers in the body; the
// numbering is historical, so the stages do not run in numeric order):
//   1a   Stratify options into Z (r=0) and P (r>0).
//   4    Single-option sweep. Numbered last in the original design but
//        run first here because it also seeds the dominance data and
//        the stage-5 top-K ranking.
//   1b   Dominance pruning: drop option i when some option j costs no
//        more on either budget and yields at least as much of every
//        ingredient (with strict improvement on some axis).
//   2    Joint LP relaxation → score upper bound + its support set.
//   2b   LP-dual marginal-value filter: drop options that, even at
//        solo-max multiplicity, would cost more than half the gap
//        budget to include.
//   3    Pairwise P×P scan, ternary search on k_j (score is concave
//        in k_j for a fixed option pair).
//   3b   Z×P and Z×Z pairwise scans.
//   5    Gap check; if (score_LP − best)/score_LP > ε, run a triple
//        fallback restricted to the top-K=20 options by single-option
//        score.
//
// All score evaluations share one compiled inner LP (value-function.ts)
// and a scratch inventory map to avoid per-call allocation in the hot
// path (the inner LP is solved on the order of millions of times).
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

  // Per-target legendary log-odds weights Q_T = −log(1 − p_legendary_per_craft_T),
  // constant for each chosen artifact. These weight the inner LP's craft objective
  // (Σ_T Q_T · p_T) so a craft of a higher-value target counts for more.
  const targets = desired_artifact_node_ids;
  const QByTarget = new Map<string, number>();
  for (const t of targets) {
    const pCraft = recipe_dag.get(t)?.legendaryCraftProbability ?? 0;
    QByTarget.set(t, pCraft <= 0 ? 0 : pCraft >= 1 ? 1e6 : -Math.log(1 - pCraft));
  }

  const innerLp = compileInnerLp(recipe_dag, desired_artifact_node_ids, QByTarget);
  const scratchInv = new Map<string, number>();

  // Direct optimisation of best_probability via the substitution
  //   score(alloc) = Σ_T Q_T · p_T*(alloc)  +  Σ_T Σ_i k_i · L_i[T]
  //               = (inner weighted craft value) + (direct legendary drops)
  // Maximising score maximises best_probability and is monotone in the budget S.
  // The inner score is concave in inventory (a weighted sum of concave LP values)
  // and the legendary term is linear, so the ternary search, dominance, and dual
  // filter remain valid. Direct *non-legendary* drops of a target no longer enter
  // the craft value: a final target has no conservation row, so its inventory is
  // inert; an ingredient-target's drops feed its parent through that row instead.
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
      for (const t of targets) directLegendary += k * (opt.legendary_yield_vector.get(t) ?? 0);
    }
    return innerLp.solve(scratchInv).score + directLegendary;
  };

  const baseScore = (() => {
    scratchInv.clear();
    for (const [k, v] of base_yield) scratchInv.set(k, v);
    return innerLp.solve(scratchInv).score;
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
  const jointLp = solveJointLp(allSurvivors, options, innerLp, R, S, base_yield, targets, recipe_dag, QByTarget);
  const scoreLP = jointLp.score;
  const lpSupport = new Set<number>(jointLp.support);

  // ------------------------------------------------------------
  // Step 2b — LP-dual marginal-value filter (score units)
  //
  // At the LP optimum every action's reduced cost is RC_i ≤ 0:
  //   c_i  = Σ_T L_i[T]
  //   RC_i = c_i + Σ_n Δ_i[n] · y_n − r_i · y_R − s_i · y_S
  // where y_R, y_S are the budget shadow prices and y_n are the
  // ingredient/target shadow prices on the inner conservation rows. The
  // craft value of an option's drops (including drops of an ingredient-
  // target) is carried entirely by the Σ_n Δ_i[n] · y_n term — direct
  // target drops are never rewarded by a standalone Q · Δ_i[T] term. Using
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
      if (lpSupport.has(i)) continue; // never drop an option in the LP support
      const opt = options[i];
      let rc = 0;
      for (const t of targets) rc += opt.legendary_yield_vector.get(t) ?? 0;
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
    // Top-K survivors by score-alone. Heuristic: restricting the triple
    // search to the top-K=20 by score-alone keeps the O(K³ · log² S) cost
    // tractable, and triples involving low-score options rarely improve
    // the joint solution.
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

  // Recover the deterministic per-target craftable counts at the chosen integer
  // allocation (one extra inner-LP solve). No node deletion is needed: a final
  // target has no conservation row, so its direct drops in final_yield_vector are
  // inert; an ingredient-target's drops correctly feed its parent.
  const finalSolve = innerLp.solve(final_yield_vector);
  const per_target = desired_artifact_node_ids.map(t => {
    const craftCount =
      finalSolve.craftByTarget.get(t) ?? (recipe_dag.get(t)?.is_leaf ? (final_yield_vector.get(t) ?? 0) : 0);
    const p = alphaToProb(craftCount, total_legendary, [t], recipe_dag);
    return { nodeId: t, expected_crafts: craftCount, ...p };
  });
  // Scalar fields report the primary target; multi-target consumers read per_target.
  const primary = per_target[0] ?? {
    best_probability: 0,
    craft_probability: 0,
    drop_probability: 0,
    expected_crafts: 0,
  };

  return {
    best_probability: primary.best_probability,
    craft_probability: primary.craft_probability,
    drop_probability: primary.drop_probability,
    expected_crafts: primary.expected_crafts,
    fuel_used,
    fuel_by_egg,
    time_units_used: Math.round(time_secs),
    choice_history,
    expected_drops: [], // populated by index.ts
    final_yield_vector,
    recipe_dag,
    craft_primal: finalSolve.primalByNode,
    per_target,
  };
}

// ============================================================
// Helpers
// ============================================================

// Evaluates the score (Q·α + direct legendary yield) for an allocation given as
// [optionIndex, multiplicity] pairs. Backed by the shared inner LP in optimizeFull.
type EvalFn = (multipliers: ReadonlyArray<readonly [number, number]>) => number;

/**
 * Pairwise scan over the (k_i, k_j) lattice with ternary search on
 * k_j (the score is concave in k_j for a fixed option pair). Handles
 * all of P×P, Z×P, Z×Z: a zero-fuel option makes the fuel-bound on k
 * collapse to Infinity, which is then clamped against the time bound.
 */
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
  const r_i = oi.actual_fuel,
    s_i = oi.actual_time;
  const r_j = oj.actual_fuel,
    s_j = oj.actual_time;
  if (s_i <= 0 || s_j <= 0) return;

  const k_j_max_R = r_j > ZERO_TOL ? Math.floor(R / r_j) : Infinity;
  const k_j_max_S = Math.floor(S / s_j);
  const k_j_max = Math.min(k_j_max_R, k_j_max_S);
  if (k_j_max < 0) return;

  // Largest k_i that still fits both budgets once k_j batches of j are committed.
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

/**
 * Triple scan with nested ternary search on k_i and k_j and a
 * deterministic k_k from the remaining budget. Uses the same
 * concavity-of-score assumption along each axis.
 */
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
  const r_i = oi.actual_fuel,
    s_i = oi.actual_time;
  const r_j = oj.actual_fuel,
    s_j = oj.actual_time;
  const r_k = ok.actual_fuel,
    s_k = ok.actual_time;
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

  // Outer ternary on k_i. For each k_i, an inner ternary on k_j.
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

/**
 * Ternary search over an integer interval for the maximiser of an
 * approximately-concave function. The probe callback returns
 * `{ score, ...extra }` and the carried `extra` fields propagate
 * back with the winning probe.
 */
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

// ============================================================
// Step 2 joint LP (action multipliers x_i + recipe runs p_n)
// ============================================================

interface JointLpResult {
  /** LP optimum value in score units = Σ_T Q_T · p_T + Σ x_i · Σ_T L_i[T] (+ const). */
  score: number;
  /** x_i for each surviving option. */
  x: Float64Array;
  /** Indices into the original `options` array of the LP support (options with x_i > 0). */
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
  targets: string[],
  recipe_dag: RecipeDAG,
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

  // Objective in score units:
  //   max Σ_T Q_T · p_T + Σ x_i · Σ_T L_i[T]
  // Direct target drops Δ_i[T] are NOT rewarded directly; their craft value is
  // carried by the conservation rows (a consumed ingredient-target's drops relax
  // its row), and a final target's drops are inert.
  const c = new Float64Array(totalVars);
  for (const [t, q] of QByTarget) {
    const tIdx = innerLp.varIndex.get(t);
    if (tIdx !== undefined) c[nx + tIdx] = q;
  }
  for (let s = 0; s < nx; s++) {
    const opt = options[survivors[s]];
    let ci = 0;
    for (const t of targets) ci += opt.legendary_yield_vector.get(t) ?? 0;
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

  // Inner conservation constraints: per consumed node n with parents,
  //   Σ_parents q · p_parent − [p_n if non-leaf] − Σ x_i · Δ_i[n] ≤ base_yield[n]
  // Targets are no longer excluded — an ingredient-target gets a row like any
  // other consumed node; a final target has no parents and so no row.
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
  let score = result.objective;
  for (const [t, q] of QByTarget) score += q * (base_yield.get(t) ?? 0);
  const dualR = result.duals[0];
  const dualS = result.duals[1];
  const nodeDuals = new Map<string, number>();
  for (let r = 0; r < constraintRowNode.length; r++) {
    nodeDuals.set(constraintRowNode[r], result.duals[2 + r]);
  }
  return { score, x, support, dualR, dualS, nodeDuals };
}
