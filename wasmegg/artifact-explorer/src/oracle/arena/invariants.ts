// Metamorphic invariants for the mission planner.
//
// Every check below asserts a property that must hold *without knowing the
// optimum*: grow the feasible set and the answer cannot get worse, relabel the
// inputs and it cannot move at all, and whatever comes back has to be a plan
// that actually fits. That is what makes them usable as an arena — a candidate
// solver needs no reference answer to be graded against, only itself under
// perturbation.
//
// Nothing here imports a solver. The planner arrives as an argument.
//
// Comparisons are in log space
// ----------------------------
// The joint probability of a four-target plan on a mediocre fleet is routinely
// 1e-13 or smaller. Relative comparisons with an absolute floor (the shape this
// harness originally used, floored at 1e-9) treat every one of those as
// unmeasurable and skip it: on the default 40-seed sweep that silently disabled
// 13 instances, including 10 of the 15 four-target ones — precisely the regime
// multi-target support exists for.
//
// In log space a drop from 1e-13 to 1e-14 is 2.30 nats and reads exactly as
// loudly as 0.5 -> 0.05. So every comparison here is a difference of logs
// against a tolerance in nats, and probability 0 is -Infinity: a solver that
// returns nothing where another returns 1e-13 fails, as it should.

import { ei, spaceshipList } from 'lib';
import { EFFORT_LAUNCH_PERIOD_SECONDS, EFFORT_LEVELS } from '@/store/schema';
import type { RecipeDAG } from '../../lib/types';
import type { Planner } from './contract';
import {
  budgetsOf,
  craftUnitPrices,
  feasible,
  fuelWithinCapacity,
  oracleInstanceOf,
  run,
  signature,
  type SolveOverrides,
  type Solved,
} from './harness';
import type { ArenaInstance } from './instances';
import { evaluateAllocationJoint } from '../evaluate';

// Float LP work drifts by a few ulps; below this a difference is arithmetic,
// not behaviour. 1e-9 nats is ~1e-9 relative.
const EXACT_NATS = 1e-9;
// Perturbations that pass through the arithmetic (rescaling, duplicating an
// option) get a wider band than pure relabelings.
const REBUILT_NATS = 1e-6;
// Ordering checks. Anything smaller than this is not a real regression.
const ORDER_NATS = 1e-6;

// Add-side width for the 4-opt pass. The loop is O(held^2 * candidates^2) with
// a joint LP solve at each point, so this is the number that decides whether
// the tier is minutes or hours.
const KOPT4_MAX_CANDIDATES = 32;

const lg = (p: number): number => (p > 0 ? Math.log(p) : -Infinity);

// `to` is worse than `from` by more than `tol` nats.
function dropped(from: number, to: number, tol = ORDER_NATS): boolean {
  return lg(to) < lg(from) - tol;
}

// `candidate` beats `base` by more than `tol` nats.
function improved(base: number, candidate: number, tol = ORDER_NATS): boolean {
  return lg(candidate) > lg(base) + tol;
}

// The two differ by more than `tol` nats.
function differs(a: number, b: number, tol: number): boolean {
  const la = lg(a);
  const lb = lg(b);
  if (la === -Infinity && lb === -Infinity) return false;
  return Math.abs(la - lb) > tol;
}

export interface Violation {
  invariant: string; // 'A1-fuel', 'B1-option-order', ...
  instance: string;
  detail: string;
  // Signed size of the failure in nats, when the check is a comparison. Lets
  // the scorecard rank a 12-nat collapse above a 1e-5-nat wobble instead of
  // counting both as one violation.
  nats?: number;
}

// `toFixed(6)` on a percentage runs out of digits at 0.000001%, i.e. a
// probability of 1e-8: anything below that renders as "0.000000%", which makes a
// violation line unreadable exactly where the numbers are most suspect. So the
// switch to exponential sits at that probability, and the same constant is what
// the predicate tests. (The percentage and the probability differ by the factor
// of 100 between them; the constant below is in probability, like every other
// number this file compares.)
const PCT_FIXED_FLOOR = 1e-8;
const pct = (x: number) => (x < PCT_FIXED_FLOOR ? `${(x * 100).toExponential(3)}%` : `${(x * 100).toFixed(6)}%`);
const gap = (from: number, to: number) => `${(lg(to) - lg(from)).toFixed(4)} nats`;

export interface CheckContext {
  planner: Planner;
  inst: ArenaInstance;
  out: Violation[];
}

const solve = (c: CheckContext, over: SolveOverrides = {}): Solved => run(c.planner, c.inst, over);

// ---------------------------------------------------------------------------
// A. Monotonicity. Growing the feasible set cannot lower the optimum.
// ---------------------------------------------------------------------------

// Shared driver: solve along an axis ordered most- to least-constrained and
// require the judged joint probability to be non-decreasing.
function monotone(id: string, c: CheckContext, axis: { label: string; over: SolveOverrides }[]) {
  let prev = -1;
  let prevLabel = '';
  for (const step of axis) {
    const p = solve(c, step.over).joint;
    if (prev >= 0 && dropped(prev, p)) {
      c.out.push({
        invariant: id,
        instance: c.inst.label,
        detail: `${step.label} gives ${pct(p)} but the more constrained ${prevLabel} gives ${pct(prev)} (${gap(prev, p)})`,
        nats: lg(p) - lg(prev),
      });
    }
    prev = p;
    prevLabel = step.label;
  }
}

export function checkA1Fuel(c: CheckContext) {
  monotone(
    'A1-fuel',
    c,
    [1, 1.05, 1.1, 1.25, 1.5, 2].map(m => ({
      label: `fuel x${m}`,
      over: { fuelCapacity: c.inst.fuelCapacity * m },
    }))
  );
}

export function checkA2Time(c: CheckContext) {
  monotone(
    'A2-time',
    c,
    [1, 1.05, 1.25, 1.5, 2].map(m => ({
      label: `time x${m}`,
      over: { timeCapacity: Math.round(c.inst.timeCapacity * m) },
    }))
  );
}

// The golden egg budget, which is the one budget that does not constrain the
// allocation. Missions cost no golden eggs; the cap binds on the craft split,
// which the judge solves for itself under the same row (`../evaluate.ts`). So
// this is a pure monotonicity check and there is no C1-style feasibility twin
// for it — there is nothing about a returned allocation left to verify.
//
// The axis is anchored on the baseline plan's own bill for its target crafts,
// not on an absolute figure: golden egg prices span several decades across the
// artifact tiers, so a fixed capacity would be slack on every cheap instance
// and crushing on every dear one, and the check would measure the tier of the
// target rather than the solver. The anchor understates the true bill, which
// consumes intermediate tiers too, so the tight end of the axis genuinely bites.
//
// One caveat this axis shares with the rest of the A family, worth knowing
// before reading a violation as a bug in the cap. A budget large enough to be
// provably redundant can still change the plan at the shipped node budget:
// measured on tachyon-deflector-4, a cap at 100x the plan's own bill returned a
// different — and slightly better — plan than no cap at all, the two converging
// once `maxNodes` reached 50. So a violation here can be branch-and-bound
// truncation rather than anything about golden eggs, which is what
// `solver/RESULTS.md` says about the A family generally.
export function checkA9GoldenEggs(c: CheckContext) {
  const base = solve(c);
  const prices = craftUnitPrices(base.problem.dag, c.inst.previousCrafts);
  let anchor = 0;
  for (const t of base.judged.perTarget) {
    anchor += (prices.get(t.nodeId) ?? 0) * Math.max(0, t.expectedCrafts);
  }
  // A plan that crafts nothing prices at nothing, and every capacity on the
  // axis would be zero. Nothing to learn, and the axis would read as trivially
  // monotone; the zero-probability instances the sweep is full of land here.
  if (!(anchor > 0)) return;

  monotone('A9-golden-eggs', c, [
    ...[0.25, 0.5, 1, 2, 4].map(m => ({
      label: `golden eggs x${m}`,
      over: { craftBudget: { capacity: anchor * m, unitPrices: prices } } as SolveOverrides,
    })),
    // The cap removed altogether is the loosest point on the axis, and it is
    // also the problem every other check in this file solves — so this step ties
    // the budget axis back to the rest of the sweep.
    { label: 'no golden egg cap', over: {} as SolveOverrides },
  ]);
}

export function checkA3Menu(c: CheckContext) {
  const full = solve(c).joint;
  for (const ship of spaceshipList) {
    if (!c.inst.config.shipVisibility[ship]) continue;
    const config = {
      ...c.inst.config,
      shipVisibility: { ...c.inst.config.shipVisibility, [ship]: false },
    };
    const sub = solve(c, { config }).joint;
    if (improved(full, sub)) {
      c.out.push({
        invariant: 'A3-menu',
        instance: c.inst.label,
        detail: `hiding ${ei.MissionInfo.Spaceship[ship]} gives ${pct(sub)}, better than the full menu's ${pct(full)} (${gap(full, sub)})`,
        nats: lg(sub) - lg(full),
      });
    }
  }
}

// The nodes some recipe in the DAG actually eats. Stocking anything else is
// unrepresentable in the model — `computeBaseYield` drops it for exactly this
// reason — so a "lopsided inventory" test has to draw its single item from here
// or it risks asserting monotonicity over a no-op.
function consumedNodeIds(dag: RecipeDAG): string[] {
  const consumed = new Set<string>();
  for (const node of dag.values()) {
    if (node.isLeaf) continue;
    for (const child of node.children) consumed.add(child.nodeId);
  }
  return [...consumed].sort();
}

export function checkA4Inventory(c: CheckContext) {
  const bare = solve(c);

  // Two shapes of inventory, because they fail differently.
  //
  // Uniform: stock every non-target node. A solver that handles inventory at
  // all passes this, since it lifts the floor under every conservation row at
  // once and rarely changes which plan is best.
  //
  // Lopsided: stock exactly one consumed component and nothing else. This is
  // the discriminating case — it does not raise the computation floor
  // uniformly, it makes one branch of the recipe cheaper than its siblings, so
  // a solver that models inventory as a global slack (or that only re-plans
  // when *every* row moved) can pass the uniform case and fail here. Both are
  // still pure relaxations of the conservation rows, so neither may lower the
  // judged joint.
  const consumed = consumedNodeIds(bare.problem.dag);

  const uniform = new Map<string, number>();
  for (const id of bare.problem.dag.keys()) {
    if (c.inst.targets.includes(id)) continue;
    uniform.set(id, 25);
  }

  const axis: { label: string; over: SolveOverrides }[] = [];
  if (consumed.length > 0) {
    // Deterministic pick from a sorted list, varied across the sweep by the
    // instance seed so the sample covers more than one node shape.
    const solo = consumed[c.inst.seed % consumed.length];
    axis.push({ label: `owning 25x ${solo} alone`, over: { baseYield: new Map([[solo, 25]]) } });
  }
  axis.push({ label: 'owning 25x of every ingredient', over: { baseYield: uniform } });

  for (const step of axis) {
    const p = solve(c, step.over).joint;
    if (dropped(bare.joint, p)) {
      c.out.push({
        invariant: 'A4-inventory',
        instance: c.inst.label,
        detail: `${step.label} gives ${pct(p)}, worse than owning nothing at ${pct(bare.joint)} (${gap(bare.joint, p)})`,
        nats: lg(p) - lg(bare.joint),
      });
    }
  }
}

export function checkA5Effort(c: CheckContext) {
  // Ordered least to most effort: the launch period floor shrinks, so every
  // option costs no more time than before.
  const byPeriod = [...EFFORT_LEVELS].sort((a, b) => EFFORT_LAUNCH_PERIOD_SECONDS[b] - EFFORT_LAUNCH_PERIOD_SECONDS[a]);
  monotone(
    'A5-effort',
    c,
    byPeriod.map(e => ({ label: `effort=${e}`, over: { effort: e } }))
  );
}

export function checkA6Capacity(c: CheckContext) {
  monotone(
    'A6-zerog',
    c,
    [0, 3, 6, 10].map(lvl => ({
      label: `zero-g=${lvl}`,
      over: { config: { ...c.inst.config, epicResearchZerogLevel: lvl } },
    }))
  );
}

// Doubling from the floor, capped at the game's max, with 29 spliced in so the
// top pair is a single level apart.
//
// The craft-rarity multiplier moves fastest at the low end, so the geometric
// prefix keeps that region densely sampled. 29 -> 30 is the tightest increment
// the parameter admits, so passing it means monotone in the level itself
// rather than in some bucketing of it.
const A7_CRAFTING_LEVELS = [1, 2, 4, 8, 16, 29, 30];

export function checkA7CraftingLevel(c: CheckContext) {
  monotone(
    'A7-crafting',
    c,
    A7_CRAFTING_LEVELS.map(lvl => ({ label: `crafting=${lvl}`, over: { craftingLevel: lvl } }))
  );
}

export function checkA8Targets(c: CheckContext) {
  if (c.inst.targets.length < 2) return;
  const full = solve(c).joint;
  for (let i = 0; i < c.inst.targets.length; i++) {
    const fewer = c.inst.targets.filter((_, k) => k !== i);
    const p = solve(c, { targets: fewer }).joint;
    // Dropping a target removes a factor <= 1 from the product and frees
    // budget, so it can only help.
    if (dropped(full, p)) {
      c.out.push({
        invariant: 'A8-targets',
        instance: c.inst.label,
        detail: `dropping ${c.inst.targets[i]} gives ${pct(p)}, worse than keeping it at ${pct(full)} (${gap(full, p)})`,
        nats: lg(p) - lg(full),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// B. Invariance. Relabelings and rescalings must not move the answer.
// ---------------------------------------------------------------------------

// Local seeded PRNG (mulberry32, the same generator `../generate.ts` uses for
// instance construction), not `Math.random`.
//
// Not for randomness quality — a Fisher-Yates shuffle of a menu does not need a
// good generator. For reproducibility, which the arena depends on twice over:
//
//  - B5-determinism asserts the *planner* returns the same plan for the same
//    problem. If the perturbations the other B checks feed it were themselves
//    unrepeatable, a B1 failure would be a permutation nobody can reconstruct,
//    and "run it again" would neither confirm nor clear it.
//  - A sweep writes its violations to `results/` and they get compared across
//    runs and across candidates. With `Math.random` the menu order would differ
//    per run and per solver, so two scorecards would not be measuring the same
//    perturbation and a diff between them would mean nothing.
//
// Seeded from the instance seed and the shuffle index, so the whole sweep is a
// pure function of `ARENA_SEED_BASE`.
function rngFor(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function checkB1OptionOrder(c: CheckContext, seeds = 3) {
  const base = solve(c).joint;
  for (let s = 1; s <= seeds; s++) {
    const rng = rngFor(c.inst.seed * 31 + s);
    const p = solve(c, {
      transformOptions: options => {
        const sh = options.slice();
        for (let i = sh.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [sh[i], sh[j]] = [sh[j], sh[i]];
        }
        return sh;
      },
    }).joint;
    if (differs(base, p, EXACT_NATS)) {
      c.out.push({
        invariant: 'B1-option-order',
        instance: c.inst.label,
        detail: `shuffle ${s} gives ${pct(p)} vs ${pct(base)} in the enumerated order (${gap(base, p)})`,
        nats: lg(p) - lg(base),
      });
    }
  }
}

export function checkB2TargetOrder(c: CheckContext) {
  if (c.inst.targets.length < 2) return;
  const base = solve(c).joint;
  const reversed = solve(c, { targets: [...c.inst.targets].reverse() }).joint;
  if (differs(base, reversed, EXACT_NATS)) {
    c.out.push({
      invariant: 'B2-target-order',
      instance: c.inst.label,
      detail: `reversing the target list gives ${pct(reversed)} vs ${pct(base)} (${gap(base, reversed)})`,
      nats: lg(reversed) - lg(base),
    });
  }
}

// B3 is a units check, and it is the only one in the file.
//
// Multiplying every fuel cost *and* the tank by the same k is a change of unit,
// nothing else: the feasible set is literally the same set of allocations, and
// the objective never mentions fuel. So any k-dependence is a solver reading an
// absolute fuel figure as if it meant something. Concretely, what this catches:
//
//  - an absolute epsilon on the fuel row (`slack > 1e-6`, `cost < 1`), which
//    silently prunes or admits different options once fuel figures move by 4x.
//    Real fuel runs from ~1e3 to ~1e18 across the instance space, so a constant
//    that looks safe on one instance is nonsense on another;
//  - a hardcoded scaling/conditioning factor, or an LP handed raw 1e18
//    coefficients without normalisation, where the simplex tolerance starts
//    deciding feasibility;
//  - a heuristic ranking options by a fuel figure compared against a literal
//    rather than against the budget.
//
// Nothing else here can see that. A1-fuel moves the tank while the costs stay
// put, which is a genuine relaxation and a monotonicity question; B3 moves both
// together, so the answer must not move at all. A solver can pass every A check
// and still be quietly unit-dependent.
//
// The incumbent passes exactly, not within tolerance, because it normalises fuel
// to a budget of 1 before modelling (see `src/lib/solver/SPEC.md`) — which is the
// property this invariant exists to keep true of future candidates too.
export function checkB3FuelScale(c: CheckContext) {
  const base = solve(c).joint;
  // Powers of two so the rescale is exact in binary floating point and a
  // failure means conditioning, not rounding.
  for (const k of [0.25, 4]) {
    const p = solve(c, {
      fuelCapacity: c.inst.fuelCapacity * k,
      transformOptions: options =>
        options.map(o => ({
          ...o,
          actualFuel: o.actualFuel * k,
          fuelByEgg: new Map([...o.fuelByEgg].map(([e, v]) => [e, v * k])),
        })),
    }).joint;
    if (differs(base, p, REBUILT_NATS)) {
      c.out.push({
        invariant: 'B3-fuel-scale',
        instance: c.inst.label,
        detail: `scaling every fuel cost and the tank by ${k} gives ${pct(p)} vs ${pct(base)} (${gap(base, p)})`,
        nats: lg(p) - lg(base),
      });
    }
  }
}

// There is no B4, and there never was one — `git log -p` on this file shows the
// numbering landing with the gap already in it. It is not a retired check whose
// coverage went missing.
//
// The slot is left empty rather than closed up because the ids are the arena's
// public vocabulary: they are what `results/*.json` keys violations by, what the
// scorecard tables in `ARENA.md` are written against, and what
// `src/lib/solver/SPEC.md` cites when it argues which invariants the model holds
// structurally. Renumbering B5 -> B4 and B6 -> B5 would silently re-point every
// one of those at a different check, which is a worse outcome than a gap in a
// sequence. New invariances take the next free number (B7); B4 stays vacant.
export function checkB5Determinism(c: CheckContext, repeats = 3) {
  // `fresh` on every call: a cached plan compared against itself would report
  // any planner deterministic, which is the one thing this check must not do.
  const first = solve(c, { fresh: true });
  const sig = signature(first);
  for (let k = 1; k < repeats; k++) {
    const again = solve(c, { fresh: true });
    if (signature(again) !== sig || again.joint !== first.joint) {
      c.out.push({
        invariant: 'B5-determinism',
        instance: c.inst.label,
        detail: `repeat ${k} returned a different plan (${pct(again.joint)} vs ${pct(first.joint)})`,
        nats: lg(again.joint) - lg(first.joint),
      });
      return;
    }
  }
}

export function checkB6DuplicateOption(c: CheckContext) {
  const base = solve(c);
  if (base.problem.options.length === 0) return;
  const target = base.problem.options[Math.floor(base.problem.options.length / 2)];
  const duplicated = solve(c, {
    // A second copy of a mission already on the menu is the same choice; it
    // must not change what the plan achieves.
    transformOptions: options => [...options, { ...target, id: `${target.id}::dup` }],
  });
  if (differs(base.joint, duplicated.joint, REBUILT_NATS)) {
    c.out.push({
      invariant: 'B6-duplicate',
      instance: c.inst.label,
      detail: `duplicating ${target.ship.name} -> ${target.target ?? 'untargeted'} gives ${pct(duplicated.joint)} vs ${pct(base.joint)} (${gap(base.joint, duplicated.joint)})`,
      nats: lg(duplicated.joint) - lg(base.joint),
    });
  }
}

// ---------------------------------------------------------------------------
// C. Self-consistency. No oracle needed, and free at any instance size.
// ---------------------------------------------------------------------------

// C0 is about the contract itself rather than the optimisation: a candidate
// that returns a wrong-length or fractional allocation is broken in a way worth
// separating from one that returns an infeasible or suboptimal plan.
export function checkC0Contract(c: CheckContext) {
  const s = solve(c);
  for (const b of s.breaches) {
    c.out.push({ invariant: 'C0-contract', instance: c.inst.label, detail: b.detail });
  }
}

export function checkC1Feasibility(c: CheckContext) {
  const s = solve(c);
  const b = budgetsOf(s.problem, s.allocation);
  if (!fuelWithinCapacity(b.fuel, s.problem.fuelCapacity)) {
    c.out.push({
      invariant: 'C1-feasibility',
      instance: c.inst.label,
      detail: `plan burns ${b.fuel.toExponential(4)} fuel against a ${s.problem.fuelCapacity.toExponential(4)} tank`,
    });
  }
  if (b.pack !== 'packs') {
    c.out.push({
      invariant: 'C1-feasibility',
      instance: c.inst.label,
      detail:
        b.pack === 'undecided'
          ? `packing undecided within the node budget (${b.totalTime.toFixed(0)}s over ${s.problem.slots} slots of ${s.problem.timeCapacity}s)`
          : `plan does not pack into ${s.problem.slots} slots of ${s.problem.timeCapacity}s (${b.totalTime.toFixed(0)}s total)`,
    });
  }
}

export function checkC2Honesty(c: CheckContext) {
  const s = solve(c);
  if (!s.result.reported) return; // opt-in
  const claimed = s.result.reported.jointProbability;
  const expected = s.joint;
  if (differs(claimed, expected, REBUILT_NATS)) {
    c.out.push({
      invariant: 'C2-honesty',
      instance: c.inst.label,
      detail: `reported ${pct(claimed)} but an independent re-evaluation of the same allocation gives ${pct(expected)} (${gap(expected, claimed)})`,
      nats: lg(claimed) - lg(expected),
    });
  }
}

export function checkC3JointIsProduct(c: CheckContext) {
  const s = solve(c);
  if (!s.result.reported) return; // opt-in
  const r = s.result.reported;
  if (r.perTarget.length !== s.problem.targets.length) return; // C0 reported it
  const product = r.perTarget.reduce((a, p) => a * p, 1);
  if (differs(product, r.jointProbability, EXACT_NATS)) {
    c.out.push({
      invariant: 'C3-joint-product',
      instance: c.inst.label,
      detail: `reported jointProbability ${pct(r.jointProbability)} but the reported per-target factors multiply to ${pct(product)}`,
      nats: lg(product) - lg(r.jointProbability),
    });
  }
}

// ---------------------------------------------------------------------------
// M. Cross-path. Bound the multi-target answer using the single-target path.
// ---------------------------------------------------------------------------

// M2: the joint plan is itself a feasible single-target plan, so a solo solve
// at the same budget must do at least as well on that target. M1 (joint <=
// product of solos) follows by multiplying, and is reported from the same
// solves.
export function checkM1M2SoloDominance(c: CheckContext) {
  if (c.inst.targets.length < 2) return;
  const joint = solve(c);
  // `perTarget` is positional against the instance's target list. That is the
  // judge's contract, but reading it by index without saying so would turn a
  // future reordering into a silently wrong M2 rather than a failure.
  if (joint.judged.perTarget.length !== c.inst.targets.length) {
    throw new Error(
      `arena: judged perTarget has ${joint.judged.perTarget.length} entries for ${c.inst.targets.length} target(s)`
    );
  }
  let product = 1;
  for (let i = 0; i < c.inst.targets.length; i++) {
    const t = c.inst.targets[i];
    const solo = solve(c, { targets: [t] }).joint;
    product *= solo;
    const fromJoint = joint.judged.perTarget[i].bestProbability;
    if (dropped(fromJoint, solo)) {
      c.out.push({
        invariant: 'M2-projection',
        instance: c.inst.label,
        detail: `solo solve for ${t} reaches ${pct(solo)}, but the joint plan already reaches ${pct(fromJoint)} on it (${gap(fromJoint, solo)})`,
        nats: lg(solo) - lg(fromJoint),
      });
    }
  }
  if (improved(product, joint.joint)) {
    c.out.push({
      invariant: 'M1-solo-product',
      instance: c.inst.label,
      detail: `joint ${pct(joint.joint)} exceeds the product of solo optima ${pct(product)} (${gap(product, joint.joint)})`,
      nats: lg(joint.joint) - lg(product),
    });
  }
}

// M3: solve each target alone on its own slice of the budget. The union of
// those plans is feasible at the full budget -- fuel sums exactly, and the
// packings concatenate slot-wise since each sub-plan loads a slot by at most
// its share of the horizon. So the joint search must not lose to it.
//
// This is the regression guard for the ALL-of objective: if the joint search
// ever collapses onto one target, this construction beats it.
//
// It is the only check in the file that can catch that, and the reason is the
// direction of the bound. M3 is the file's one *lower* bound on the joint
// objective — it fails when the answer is too small. Everything nearby fails for
// the opposite reason or for a different reason entirely:
//
//  - M1/M2 are upper bounds. They fail when the joint claims more than the solos
//    can justify. A solver that abandons three of four targets and returns
//    ~0 satisfies both trivially — it never claims anything.
//  - A8-targets is monotonicity under dropping a target, not a bound on the
//    answer. A uniformly collapsed solver is still monotone, so A8 stays green.
//  - D1/D2 also fail on "too small", but only for a plan the k-opt neighbourhood
//    can reach: at most two lines (four for D2) moved by at most two missions.
//    The union of per-target plans is usually nowhere near that ball — it can
//    differ from the returned plan on every line at once — so a solver stuck in
//    a wide local optimum is locally optimal and still loses to M3.
//
// The `continue` on an infeasible union is what keeps this sound rather than
// what weakens it: the concatenation argument above guarantees feasibility only
// when each sub-plan really did stay inside its slice, and a sub-solve that
// overran (or an option the joint menu lacks, skipped above) can push the union
// over. Judging one of those would report a violation against a plan the solver
// was never allowed to return. Feasible unions are the common case; skipping the
// rest costs coverage on an instance, never correctness.
export function checkM3UnionLowerBound(c: CheckContext) {
  const n = c.inst.targets.length;
  if (n < 2) return;
  const joint = solve(c);
  const oracleInst = oracleInstanceOf(joint.problem);

  const splits: number[][] = [new Array(n).fill(1 / n)];
  // One skewed split as well, so the check is not blind to plans that want an
  // uneven division of the budget.
  const skew = new Array(n).fill(0.5 / (n - 1));
  skew[c.inst.seed % n] = 0.5;
  splits.push(skew);

  for (const w of splits) {
    const union = new Array<number>(joint.problem.options.length).fill(0);
    for (let i = 0; i < n; i++) {
      const part = solve(c, {
        targets: [c.inst.targets[i]],
        fuelCapacity: c.inst.fuelCapacity * w[i],
        timeCapacity: Math.floor(c.inst.timeCapacity * w[i]),
      });
      part.allocation.forEach((count, idx) => {
        if (!(count > 0)) return;
        const o = part.problem.options[idx];
        const k = joint.problem.options.findIndex(
          q => q.ship.missionTypeId === o.ship.missionTypeId && q.targetAfxId === o.targetAfxId
        );
        // A sub-solve may use an option the joint menu lacks only if the DAGs
        // differ; skipping it keeps the union a strict lower bound.
        if (k >= 0) union[k] += count;
      });
    }
    if (!feasible(joint.problem, union)) continue; // the bound only applies when it lands feasible
    const p = evaluateAllocationJoint(oracleInst, union).jointProbability;
    if (improved(joint.joint, p)) {
      c.out.push({
        invariant: 'M3-union',
        instance: c.inst.label,
        detail:
          `union of per-target plans at split [${w.map(x => x.toFixed(2)).join(',')}] reaches ${pct(p)}, ` +
          `beating the joint solve's ${pct(joint.joint)} (${gap(joint.joint, p)})`,
        nats: lg(p) - lg(joint.joint),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// D. Local optimality. No improving feasible move may exist.
// ---------------------------------------------------------------------------

// Shared engine for D1/D2. `arity` is how many option lines a single move may
// touch: 2 is the classic exchange, 4 reaches the two-simultaneous-exchange
// moves that sit behind a downhill valley.
function kOpt(id: string, c: CheckContext, arity: 2 | 4, maxDelta: number, thresholdNats: number, maxEvals: number) {
  const s = solve(c);
  const alloc = s.allocation;
  const oracleInst = oracleInstanceOf(s.problem);
  const base = s.joint;
  if (!(base > 0)) return; // nothing to improve on, in log space or otherwise

  const options = s.problem.options;
  const held: number[] = [];
  alloc.forEach((n, i) => n > 0 && held.push(i));
  if (held.length === 0) return;

  // 2-opt can afford every targeted option on the add side. 4-opt cannot: that
  // set runs to ~200 on a production instance and the quadruple loop is
  // O(held^2 * addable^2), which does not finish. Narrow it to the options
  // *adjacent* to the plan's own support -- same ship in another duration, or
  // same target on another ship -- which is where a real substitution lives.
  const heldShips = new Set(held.map(i => options[i].ship.shipType));
  const heldTargets = new Set(held.map(i => options[i].targetAfxId));
  const adjacency = (i: number) =>
    (heldShips.has(options[i].ship.shipType) ? 1 : 0) + (heldTargets.has(options[i].targetAfxId) ? 1 : 0);
  let addable: number[];
  if (arity === 2) {
    addable = options
      .map((_, i) => i)
      .filter(i => alloc[i] > 0 || options[i].targetAfxId !== ei.ArtifactSpec.Name.UNKNOWN);
  } else {
    // Filtering to adjacency is not enough on its own -- on a wide instance it
    // still leaves ~100 options against a squared loop. Rank and cap: held
    // lines first, then the doubly-adjacent, then the singly-adjacent.
    addable = options
      .map((_, i) => i)
      .filter(i => alloc[i] > 0 || adjacency(i) > 0)
      .sort((a, b) => (alloc[b] > 0 ? 1 : 0) - (alloc[a] > 0 ? 1 : 0) || adjacency(b) - adjacency(a))
      .slice(0, KOPT4_MAX_CANDIDATES);
  }

  let evals = 0;
  let exhausted = false;
  let best = { p: base, detail: '' };
  const describe = (moves: [number, number][]) =>
    moves
      .map(([i, d]) => `${d > 0 ? '+' : ''}${d} ${options[i].ship.name}->${options[i].target ?? 'untargeted'}`)
      .join(', ');

  const tryAlloc = (a: number[], moves: [number, number][]) => {
    if (evals >= maxEvals) {
      exhausted = true;
      return;
    }
    // Charged before the feasibility test, not after. `feasible` runs the full
    // packing search, so it is the expensive part of a candidate; charging only
    // the ones that pass let an instance whose candidates are mostly infeasible
    // run the loops to completion regardless of the budget.
    evals++;
    if (!feasible(s.problem, a)) return;
    const p = evaluateAllocationJoint(oracleInst, a).jointProbability;
    if (improved(best.p, p, thresholdNats)) best = { p, detail: describe(moves) };
  };

  // Pairs: -k of a held line, +m of anything.
  // `exhausted` has to unwind every level: `tryAlloc` setting it is not enough
  // on its own, and the nests below run to billions of iterations on a wide
  // instance, each one still paying for `alloc.slice()`.
  pairs: for (const i of held) {
    for (let k = 1; k <= Math.min(alloc[i], maxDelta); k++) {
      for (const j of addable) {
        if (i === j) continue;
        for (let m = 1; m <= maxDelta; m++) {
          const a = alloc.slice();
          a[i] -= k;
          a[j] += m;
          tryAlloc(a, [
            [i, -k],
            [j, m],
          ]);
          if (exhausted) break pairs;
        }
      }
    }
  }

  if (arity === 4 && !exhausted) {
    // Two simultaneous exchanges. Restricted to the plan's own support on the
    // drop side, which is what keeps this tractable.
    quads: for (let x = 0; x < held.length; x++) {
      for (let y = x + 1; y < held.length; y++) {
        const i1 = held[x];
        const i2 = held[y];
        for (const j1 of addable) {
          for (const j2 of addable) {
            if (j1 === j2) continue;
            for (let k1 = 1; k1 <= Math.min(alloc[i1], maxDelta); k1++) {
              for (let k2 = 1; k2 <= Math.min(alloc[i2], maxDelta); k2++) {
                const a = alloc.slice();
                a[i1] -= k1;
                a[i2] -= k2;
                a[j1] += k1;
                a[j2] += k2;
                if (a[i1] < 0 || a[i2] < 0) continue;
                tryAlloc(a, [
                  [i1, -k1],
                  [j1, k1],
                  [i2, -k2],
                  [j2, k2],
                ]);
                if (exhausted) break quads;
              }
            }
          }
        }
      }
    }
  }

  if (best.detail) {
    c.out.push({
      invariant: id,
      instance: c.inst.label,
      detail: `${best.detail} improves ${pct(base)} to ${pct(best.p)} (${gap(base, best.p)})`,
      nats: lg(best.p) - lg(base),
    });
  } else if (exhausted) {
    // Not a violation, but the absence of one is now uninformative: say so
    // rather than let a truncated search read as a clean bill of health.
    c.out.push({
      invariant: `${id}-inconclusive`,
      instance: c.inst.label,
      detail: `search hit its ${maxEvals}-evaluation budget with ${held.length} held lines and ${addable.length} candidates; no improving move found, but the neighbourhood was not exhausted`,
    });
  }
}

export function checkD1LocalOptimality(c: CheckContext) {
  // 1e-3 nats ~ 0.1% relative, the old threshold.
  kOpt('D1-2opt', c, 2, 2, 1e-3, 20_000);
}

export function checkD2DeepLocalOptimality(c: CheckContext) {
  kOpt('D2-4opt', c, 4, 2, 5e-3, 25_000);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export type Check = (c: CheckContext) => void;

export const CHEAP_CHECKS: Check[] = [
  checkC0Contract,
  checkC1Feasibility,
  checkC2Honesty,
  checkC3JointIsProduct,
  checkB5Determinism,
  checkB1OptionOrder,
  checkB2TargetOrder,
  checkB3FuelScale,
  checkB6DuplicateOption,
  checkA1Fuel,
  checkA2Time,
  checkA3Menu,
  checkA4Inventory,
  checkA5Effort,
  checkA6Capacity,
  checkA7CraftingLevel,
  checkA8Targets,
  checkA9GoldenEggs,
  checkM1M2SoloDominance,
  checkM3UnionLowerBound,
];

export const DEEP_CHECKS: Check[] = [checkD1LocalOptimality, checkD2DeepLocalOptimality];

export function runChecks(planner: Planner, inst: ArenaInstance, checks: Check[]): Violation[] {
  const out: Violation[] = [];
  for (const check of checks) {
    try {
      check({ planner, inst, out });
    } catch (err) {
      out.push({
        invariant: `${check.name}-threw`,
        instance: inst.label,
        detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return out;
}
