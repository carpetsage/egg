// The outer approximation: what actually turns HiGHS into a planner.
//
// HiGHS solves linear and mixed-integer *linear* programs, and this objective
// is neither — sum_T log(1 - e^-s_T) is concave and transcendental. The standard
// treatment for maximizing a concave function over an integer polytope is outer
// approximation: hold each g(s_T) under a family of its tangents and solve the
// resulting MILP. The tangents over-estimate, so the MILP's optimum is an upper
// bound on the true one, and the bound tightens as the tangent set gets finer.
//
// Classically that set is built adaptively — solve, add tangents where the
// answer landed, solve again. This does not. The grid is stated up front and
// sized by the envelope-error law recorded at `DEFAULT_TUNING` below, and there
// is exactly one MILP per plan. The refinement rounds were measured off rather
// than reasoned off; RESULTS.md carries the campaigns and what the second round
// turned out to be doing.
//
// What comes back is not the MILP's answer unconditionally. The incumbent is
// scored by `./evaluator`, the same re-derivation of the objective the other
// arena candidates are graded by, and is returned only if it certifies and
// beats the empty plan. So the linearized model steers, and the real objective
// decides — the OA never gets to grade itself.

import type { MilpLimits, MilpSolve, PlanProblem, PlanResult } from './types';
import { EXACT_PRECISION, STEERING_PRECISION, evaluateCounts } from './evaluator';
import { buildModel, type Model } from './model';
import { buildOaMilp, decodeCounts, effectiveQs, layoutOf, nCol, scaleLps, type Layout, type Tangent } from './milp';

// The one lever on cost, and it is deterministic. The obvious alternative — a
// wall-clock budget — is deliberately absent: the arena requires one allocation
// per problem, and a time limit makes the answer a function of machine load.
export interface Tuning {
  // Node budget for the MILP. This is the reason a sweep finishes: enough
  // symmetry survives the slot-load ordering rows that *proving* optimality
  // routinely costs more than finding the answer did.
  maxNodes: number;
  // Tangent points per target, in units of theta (so 1 is "this target's best
  // conceivable score"), each in (0, 1]. Stated once and solved against once —
  // nothing is added to this set while solving.
  grid: readonly number[];
}

// WHERE THE CUTS BELONG. Instrumenting the planner over 8 arena instances / 19
// targets recorded every sigma HiGHS visited and every sigma the plan realized.
// All 56 values landed in [0.27, 1.0] — none below 1e-3. That is structural
// rather than lucky: theta_t is the best score target t can reach, so sigma is
// "fraction of achievable", and the thirteen decades the arena's *scores* span
// live entirely in theta, which the normalization divides out. Plans reliably
// capture a third to all of what is reachable; low joint probabilities come from
// targets being hard, not from allocations landing in a sigma tail.
//
// The floor is the soft number here — it is set by an 8-instance sample, and no
// zero-scoring target appeared in it. `SIGMA_FLOOR` is where to move if a sweep
// ever reports a sigma below it; `SIGMA_CUTS` then follows from the error law
// below.
const SIGMA_FLOOR = 1e-5;
const SIGMA_CUTS = 100;

// `count` log-spaced points from 1 down to `floor`, both endpoints included.
function logGrid(floor: number, count: number): number[] {
  const decades = Math.log10(floor);
  return Array.from({ length: count }, (_, i) => 10 ** ((decades * i) / (count - 1)));
}

// HOW MANY CUTS. Tangent-envelope error for a log-spaced grid is (d ln10)^2 / 8
// nats at d decades per cut, independent of theta (the scale cancels: the slope
// is theta g'(theta sigma), which is ~1/sigma) and agreeing with measurement to
// 0.02%. At 100 points over five decades that is 1.7e-3 nats across the observed
// band, 61x tighter than the 15-point grid this replaced, and the slopes still
// run only 1 to 1e5 — so the count costs rows and leaves conditioning alone.
//
// HOW MANY NODES, AND WHY ONE PASS: measured, over three 40-instance campaigns
// against five other arms. The tables, the retired arms, and what the deleted
// refinement round turned out to be doing are in RESULTS.md, *What the budgets
// buy* — a single campaign cannot read a delta under about 1.5x, so re-tuning
// this pair means re-running that, not one sweep.
export const DEFAULT_TUNING: Tuning = { maxNodes: 200, grid: logGrid(SIGMA_FLOOR, SIGMA_CUTS) };

const MIP_REL_GAP = 1e-6;

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

// The self-report is opt-in because it is not free: it re-scores the plan at
// `EXACT_PRECISION`, the most expensive setting the evaluator has, and the app
// never reads it — `optimizer-core.ts` takes the allocation and derives every
// displayed number itself from the exact objective. Only the arena wants it, to
// grade the claim against its own scoring (C2/C3), so only the arena asks.
export interface SolveOptions {
  report?: boolean;
}

function emit(problem: PlanProblem, model: Model, counts: readonly number[], report: boolean): PlanResult {
  const allocation = new Array<number>(problem.options.length).fill(0);
  for (let g = 0; g < model.groups.length; g++) {
    if (counts[g] > 0) allocation[model.groups[g].members[0]] += counts[g];
  }
  if (!report) return { allocation };

  const finalEval = evaluateCounts(model, counts, EXACT_PRECISION);
  const scored = finalEval.scores.map(s => (s > 0 ? -Math.expm1(-s) : 0));
  // The model sorts its targets; the seam promises `perTarget` parallel to the
  // caller's list. Permute back.
  const perTarget = new Array<number>(scored.length);
  for (let t = 0; t < scored.length; t++) perTarget[model.requestedOrder[t]] = scored[t];
  // Multiplied in the model's own order, not the caller's. Float multiplication
  // is not associative, so folding the caller-ordered array would make the
  // reported joint differ by an ulp or two between two orderings of the same
  // target set — reintroducing, in the number the entry reports, exactly the
  // order dependence `buildModel` just removed from the plan.
  let jointProbability = 1;
  for (const p of scored) jointProbability *= p;
  return { allocation, reported: { jointProbability, perTarget } };
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
  const layout = layoutOf(model, 'scale');
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

export function solveWith(
  problem: PlanProblem,
  solve: MilpSolve,
  tuning: Tuning = DEFAULT_TUNING,
  { report = false }: SolveOptions = {}
): PlanResult {
  const model = buildModel(problem);
  const empty = new Array<number>(model.groups.length).fill(0);
  if (model.groups.length === 0 || model.targets.length === 0) return emit(problem, model, empty, report);

  const qs = effectiveQs(model);
  const limits: MilpLimits = { maxNodes: tuning.maxNodes, relGap: MIP_REL_GAP };
  const theta = scales(model, qs, solve, limits);
  if (!theta) return emit(problem, model, empty, report);

  const cuts: Tangent[] = [];
  for (let t = 0; t < model.targets.length; t++) {
    for (const at of tuning.grid) cuts.push({ target: t, at });
  }

  const solution = solve(buildOaMilp(model, qs, theta, cuts), limits);
  if (solution.status === 'infeasible' || solution.status === 'unknown') return emit(problem, model, empty, report);

  const layout = layoutOf(model, 'oa');
  const counts = decodeCounts(model, layout, solution.columnValues);
  const judged = evaluateCounts(model, counts, STEERING_PRECISION);
  // An uncertified incumbent is dropped, not patched, and so is one the empty
  // plan already beats — which is not vacuous: a node-limited search can return
  // an allocation scoring probability zero, and the empty plan at least spends
  // nothing to do that.
  const keep =
    certifies(model, layout, solution.columnValues, counts) &&
    judged.logJoint > evaluateCounts(model, empty, STEERING_PRECISION).logJoint;

  return emit(problem, model, keep ? counts : empty, report);
}
