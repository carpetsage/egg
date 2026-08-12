// The outer-approximation loop: what actually turns HiGHS into a planner.
//
// HiGHS solves linear and mixed-integer *linear* programs, and this objective
// is neither — sum_T log(1 - e^-s_T) is concave and transcendental. The standard
// treatment for maximizing a concave function over an integer polytope is outer
// approximation: hold each g(s_T) under a family of its tangents, solve the
// resulting MILP exactly, then add tangents where the answer landed and repeat.
// Every MILP in the sequence over-estimates, so its optimum is an upper bound on
// the true one, and the bound tightens monotonically as cuts accumulate.
//
// What the loop returns is not the last iterate but the best *judged* one:
// every incumbent is scored by `./evaluator`, the same re-derivation of the
// objective the other candidates use, and the winner is kept. So the linearized
// model steers, and the real objective decides — the OA never gets to grade
// itself.

import type { MilpLimits, MilpSolve, PlanProblem, PlanResult } from './types';
import { EXACT_PRECISION, STEERING_PRECISION, evaluateCounts } from './evaluator';
import { buildModel, type Model } from './model';
import {
  buildOaMilp,
  decodeCounts,
  decodeSigmas,
  effectiveQs,
  layoutOf,
  nCol,
  scaleLps,
  type Layout,
  type Tangent,
} from './milp';

// The two levers on cost, and both are deterministic. The obvious third — a
// wall-clock budget — is deliberately absent: the arena requires one allocation
// per problem, and a time limit makes the answer a function of machine load.
export interface Tuning {
  // Refinement rounds. Each one is a full MILP solve.
  maxRounds: number;
  // Node budget per MILP. This is the reason a sweep finishes: enough symmetry
  // survives the slot-load ordering rows that *proving* optimality routinely
  // costs more than finding the answer did.
  maxNodes: number;
}

// Measured, not guessed. Full 40-instance sweeps with the invariant checks:
//
//   config     median   violations   clean   worst A3-menu   mean log10(joint)
//   {2, 5}     1090ms           63   23/40      0.1951 nats            -6.775
//   {2, 50}    1208ms           62   24/40      0.2410 nats            -6.774
//   {3, 200}   2103ms           55   22/40      0.0790 nats            -6.771
//
// Plus a probe of the floor: `maxNodes: 0` returns probability zero on **every**
// instance, even at `mip_heuristic_effort: 1.0` — the root heuristics never find
// an incumbent, so branching is not optional and the 46ms that buys is not a
// mode. One round at 50 nodes is 658ms.
//
// Two things the sweeps settled. `{2,5}` and `{2,50}` are near-identical
// solvers: 36 of 40 plans come out byte-identical, the violation delta is eight
// instances moving in both directions for a net of one, and the node budget
// costs 11% of the wall clock to achieve that. And plan *quality* is flat across
// every config here — the three means sit inside 0.004 log10, which is nothing.
// What the extra rounds actually buy is monotonicity: the residual A/B failures
// are a truncated search, and their worst-case magnitude roughly triples going
// from three rounds to two.
//
// The default is `{2, 5}`: the cheap end of the two-round plateau, chosen for
// the instances real players are expected to bring rather than for the arena's
// uniform-random tail. See SPEC.md section 7.
export const DEFAULT_TUNING: Tuning = { maxRounds: 2, maxNodes: 5 };

const MIP_REL_GAP = 1e-6;
// Stop refining once the outer bound is this close to the judged value, in nats.
const BOUND_TOL = 1e-6;

// Initial tangent points, in units of theta (so 1 is "this target's best
// conceivable score"). Log-spaced because the arena's scores span thirteen
// decades: a linear grid would put every point in a regime no plan reaches.
const INITIAL_GRID = [1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 3e-3, 1e-3, 3e-4, 1e-4, 3e-5, 1e-5, 1e-6, 1e-7];
// Deepest point a refinement cut may sit at. Below this the tangent is a nearly
// vertical line through a value no allocation can distinguish.
const CUT_FLOOR = 1e-12;
// Two cut points closer than this (relatively) are the same cut.
const CUT_DEDUPE = 1e-3;

// Fuel is normalized to a budget of 1, so this is a relative slack.
const FUEL_TOL = 1e-9;
// Slack on a slot row, in seconds. Pinned to the tolerance the judge's packer
// works to, and never above it — see `certifies` below.
const SLOT_TOL = 1e-9;

function fuelOf(model: Model, counts: readonly number[]): number {
  let total = 0;
  for (let g = 0; g < counts.length; g++) {
    if (counts[g] > 0) total += counts[g] * model.groups[g].fuel;
  }
  return total;
}

// Slot loads read straight off the MILP's own columns, rounded exactly the way
// `decodeCounts` rounds them.
//
// This is the packing certificate, and it is the one HiGHS already produced:
// the assignment satisfies three slot rows, so a partition demonstrably exists.
// Re-deriving it with a search would be asking the packer to rediscover a
// witness `decodeCounts` had in hand and summed away.
function slotLoads(model: Model, layout: Layout, columnValues: Float64Array): number[] {
  const loads = new Array<number>(model.slots).fill(0);
  for (let g = 0; g < model.groups.length; g++) {
    const seconds = model.groups[g].timeSeconds;
    for (let k = 0; k < model.slots; k++) {
      const v = columnValues[nCol(layout, g, k)];
      if (Number.isFinite(v) && v > 0) loads[k] += Math.round(v) * seconds;
    }
  }
  return loads;
}

// Verifier, not a repairer.
//
// WHEN THIS IS EVER FALSE. Both budgets are rows of the model, so it is fair to
// ask whether the construction has already asserted the answer. It has not,
// and the gap is `decodeCounts`, not the solve:
//
//   * HiGHS satisfies a row only to `mip_feasibility_tolerance` (1e-9, pinned
//     in `SOLVER_OPTIONS`), and that tolerance is *absolute on the row as
//     ingested*.
//   * `decodeCounts` then *rounds*. Integrality also holds only to 1e-9, so
//     `Math.round` can move a column by up to 1e-9, and a slot row multiplies
//     that column by `timeSeconds`, which is ~1e6.
//
// That is not enough on its own to be reachable — it needs a plan sitting
// exactly on a budget. Those exist: over 231 certifications the largest fuel
// excess observed was exactly 0.000e+0, i.e. plans that fill the tank to the
// last drop, which the round-number fuel costs and tank sizes make commonplace.
// The check has never fired, but "never observed" and "unreachable" are
// different claims, and C1 is a hard failure. The branch stays.
//
// WHY `SLOT_TOL` IS 1e-9, AND NOT LOOSER. Not for resolution: measured over
// 1113 slot rows, the largest excess was exactly 0 and not one row was
// positive, so on the evidence any tolerance whatsoever accepts the same set.
// Physically a second of slack on a multi-day horizon is nothing, and the
// rounding drift above tops out three decades below that.
//
// The value is set by the goalpost instead. The arena decides C1 with its own
// packer, which admits a slot load up to `capacity + 1e-9` absolute seconds and
// calls anything past that infeasible. A `SLOT_TOL` above 1e-9 therefore opens
// a window in which this function certifies a plan the judge then hard-fails —
// the tolerance would be grading to a laxer standard than the one being graded
// against. So it is pinned at the judge's figure and must never exceed it. This
// is the same reason `SOLVER_OPTIONS` pins the feasibility tolerances at 1e-9
// and `milp.ts` states the slot rows in raw seconds rather than normalized:
// three places, one scale, all of them the packer's.
//
// The two budgets are read from different places on purpose. Fuel is checked
// against the rounded, `group.cap`-clamped `counts` — what `emit` actually
// returns. Slot loads are read off the raw columns *before* the clamp, so the
// loads checked are an upper bound on the emitted plan's: the clamp only ever
// removes missions, and a sub-multiset of a packable multiset packs.
//
// On failure the caller keeps the previous judged incumbent, so a plan is never
// mutilated into feasibility; the worst case is the empty plan, which is
// feasible and honest. C1 is a hard failure and nothing here is allowed to
// gamble with it.
function certifies(model: Model, layout: Layout, columnValues: Float64Array, counts: readonly number[]): boolean {
  if (fuelOf(model, counts) > 1 + FUEL_TOL) return false;
  const capacity = model.timeCapacitySeconds;
  for (const load of slotLoads(model, layout, columnValues)) {
    if (load > capacity + SLOT_TOL) return false;
  }
  return true;
}

function emit(problem: PlanProblem, model: Model, counts: readonly number[]): PlanResult {
  const allocation = new Array<number>(problem.options.length).fill(0);
  for (let g = 0; g < model.groups.length; g++) {
    if (counts[g] > 0) allocation[model.groups[g].members[0]] += counts[g];
  }
  const finalEval = evaluateCounts(model, counts, EXACT_PRECISION);
  const perTarget = finalEval.scores.map(s => (s > 0 ? -Math.expm1(-s) : 0));
  let jointProbability = 1;
  for (const p of perTarget) jointProbability *= p;
  return { allocation, reported: { jointProbability, perTarget } };
}

function addCut(cuts: Tangent[], target: number, at: number): boolean {
  if (!(at > 0) || !Number.isFinite(at)) return false;
  const point = Math.min(1, Math.max(CUT_FLOOR, at));
  for (const cut of cuts) {
    if (cut.target !== target) continue;
    if (Math.abs(cut.at - point) <= CUT_DEDUPE * Math.max(cut.at, point)) return false;
  }
  cuts.push({ target, at: point });
  return true;
}

// The per-target scale. theta_t is the largest score target t can reach when
// every other target is ignored and the counts are allowed to be fractional, so
// sigma_t = s_t / theta_t lands in [0, 1] for every feasible plan. Without it
// the tangent slopes are 1/s ~ 1e13 and the matrix is unconditioned; with it
// they are 1/sigma and the model is ordinary.
//
// Returns null when some target cannot be scored at all: then the joint
// probability is zero for every allocation and no plan beats the empty one.
function scales(model: Model, qs: readonly number[], solve: MilpSolve, limits: MilpLimits): number[] | null {
  const layout = layoutOf(model, false);
  const scaleLp = scaleLps(model, qs);
  const theta: number[] = [];
  for (let t = 0; t < model.targets.length; t++) {
    const solution = solve(scaleLp(t), limits);
    if (solution.status === 'infeasible' || solution.status === 'unknown') return null;
    const value = solution.columnValues[layout.sBase + t];
    if (!(value > 0) || !Number.isFinite(value)) return null;
    theta.push(value);
  }
  return theta;
}

export function solveWith(problem: PlanProblem, solve: MilpSolve, tuning: Tuning = DEFAULT_TUNING): PlanResult {
  const model = buildModel(problem);
  const empty = new Array<number>(model.groups.length).fill(0);
  if (model.groups.length === 0 || model.targets.length === 0) return emit(problem, model, empty);

  const qs = effectiveQs(model);
  const limits: MilpLimits = { maxNodes: tuning.maxNodes, relGap: MIP_REL_GAP };
  const theta = scales(model, qs, solve, limits);
  if (!theta) return emit(problem, model, empty);

  const cuts: Tangent[] = [];
  for (let t = 0; t < model.targets.length; t++) {
    for (const at of INITIAL_GRID) addCut(cuts, t, at);
  }

  const layout = layoutOf(model, true);
  let best = empty;
  let bestValue = evaluateCounts(model, empty, STEERING_PRECISION).logJoint;

  for (let round = 0; round < tuning.maxRounds; round++) {
    const solution = solve(buildOaMilp(model, qs, theta, cuts), limits);
    if (solution.status === 'infeasible' || solution.status === 'unknown') break;

    const counts = decodeCounts(model, layout, solution.columnValues);
    const judged = evaluateCounts(model, counts, STEERING_PRECISION);
    // An uncertified incumbent is dropped, not patched. It still gets to steer:
    // the cuts below are refined from where this round landed either way, so a
    // round that fails the check is informative rather than wasted.
    if (certifies(model, layout, solution.columnValues, counts) && judged.logJoint > bestValue) {
      bestValue = judged.logJoint;
      best = counts;
    }

    // A proven-optimal outer bound within tolerance of a realized value means
    // there is nothing left for a tighter approximation to find.
    if (solution.status === 'optimal' && solution.objective - bestValue <= BOUND_TOL) break;

    // Refine twice per target: where the model *thinks* the plan landed, and
    // where it actually did. The first is where the approximation is loose; the
    // second is where the plan is, and is the point the next round has to beat.
    let added = false;
    const sigmas = decodeSigmas(layout, solution.columnValues);
    for (let t = 0; t < model.targets.length; t++) {
      added = addCut(cuts, t, sigmas[t]) || added;
      const score = judged.scores[t];
      if (Number.isFinite(score)) added = addCut(cuts, t, score / theta[t]) || added;
    }
    // No new cut means the next MILP is the one just solved.
    if (!added) break;
  }

  return emit(problem, model, best);
}
