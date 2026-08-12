# The solver arena

A fixed set of correctness invariants, a fixed judge, and a one-function seam
where you plug in a mission planner. The point is to let several very different
optimisation methodologies be tried against the same bar without any of them
being able to move the bar.

If you are here to write a candidate solver, you need three things: **the
contract** (`contract.ts`), **the objective** (below, and `src/lib/OPTIMIZER.md`
for the long version), and **the rules** (below). You do not need to read the
harness, and you must not import it.

## The problem

Pick how many of each available mission to launch, so as to maximise the
probability of getting a legendary of **every** target artifact.

```ts
export type Planner = (problem: PlanProblem) => PlanResult;
```

You are given:

| field | meaning |
| --- | --- |
| `options` | the menu of launches, already enumerated from the player's ships, research and effort level. Your allocation is indexed against this array, in this order. |
| `dag` | the recipe graph for the targets: what crafts into what, how many of each ingredient a craft consumes, and each node's legendary craft chance. |
| `targets` | the desired artifact node ids. |
| `fuelCapacity` | total fuel for the whole plan. |
| `timeCapacity` | seconds available **per slot**. |
| `slots` | how many missions can be in flight at once. Always 3. |
| `baseYield` | copies of each node the player already owns. |

You return:

```ts
{
  allocation: number[],        // parallel to problem.options, non-negative integers
  reported?: {                 // optional; see "self-reporting" below
    jointProbability: number,
    perTarget: number[],
  },
}
```

### Feasibility

A plan is feasible when both hold:

- **Fuel.** `sum_i allocation[i] * options[i].actualFuel <= fuelCapacity`.
- **Packing.** The missions partition into `slots` groups, each with summed
  `actualTime` at most `timeCapacity`. This is a genuine 3-way bin packing, not
  a check that the total fits in `3 * timeCapacity` — a plan can pass the volume
  bound and still be infeasible.

The harness decides this with its own packer (`pack-feasibility.ts`), which
imports nothing and which no candidate may import. Returning an infeasible plan
is a hard failure, not a low score.

### The objective

For each target `T`, the plan produces a score

```
s_T = Q_T * (expected legendary crafts of T) + (direct legendary drops of T)
```

where `Q_T = -log(1 - legendaryCraftProbability(T))`, and the chance of landing
at least one legendary of `T` is `1 - exp(-s_T)`. Crafts are limited by the
ingredient conservation structure in the DAG: crafting a parent consumes its
children, and a fixed inventory of drops has to be split across whichever
targets want it. So the crafts themselves are the solution of an inner
allocation problem, not a closed form.

The objective is the **product** over targets:

```
maximise   prod_T (1 - exp(-s_T))
```

ALL-of, not ANY-of, deliberately: maximising ANY collapses onto whichever
target is cheapest. Equivalently, maximise `sum_T log(1 - exp(-s_T))`, which is
concave in `s` and is the form the incumbent solvers work in.

`src/oracle/evaluate.ts` is the harness's independent implementation of exactly
this, and is what scores you. It re-optimises the inner craft split for whatever
allocation you hand back, so you are never penalised for reporting a plan whose
craft accounting you did not work out yourself — hand back the allocation and
the judge will extract the best value it admits.

## Writing a candidate

1. Create `solvers/<your-id>.ts` exporting an `ArenaSolver`.
2. Register it in `registry.ts`.
3. Run `pnpm arena:check` — the independence guard — then `pnpm arena`.

```ts
import type { ArenaSolver, PlanProblem, PlanResult } from '../contract';

function plan(problem: PlanProblem): PlanResult {
  const allocation = new Array(problem.options.length).fill(0);
  // ... your methodology here ...
  return { allocation };
}

export const mySolver: ArenaSolver = {
  id: 'my-solver',
  description: 'one line for the scorecard',
  plan,
};
```

`solvers/highs/index.ts` is the worked example of the seam — a shim over the
shipped planner in `src/lib/solver/`, described in `src/lib/solver/SPEC.md`. If
your methodology does not produce an allocation vector directly, the adapting
step is yours to write: map whatever your solver returns onto counts indexed
against `problem.options`.

### Rules

- **Do not import the harness.** Not `evaluate.ts`, not `pack-feasibility.ts`,
  not `invariants.ts`, `harness.ts`, `instances.ts` or `scorecard.ts`.
  `independence.spec.ts` enforces this. Deriving your own copy of the objective
  or of a packing routine is fine and expected — sharing the harness's is not,
  because then the grader and the candidate are the same code.
- **Re-derive everything: no value import from `src/lib`.** `@/lib/lp`,
  `@/lib/value-function`, `@/lib/packing`, `@/lib/optimizer-core` and the rest
  are all off limits. `import type { LaunchOption, RecipeDAG } from '...'` is
  fine and is how you read the problem at all; the bare `lib` workspace package
  (egg, ship and artifact enums and tables) is game data rather than solver
  code and stays available.

  This is the point of the experiment. Calling into the incumbent's LP, tangent
  grid, packer or search would measure the incumbent's method wearing a
  different hat. Build your own — the objective is fully specified above and in
  `src/lib/OPTIMIZER.md`, and you are free to model it however your methodology
  wants. Reading `src/lib` for reference is encouraged; importing it is not.

  There is one exception, and it is narrow: `solvers/highs/index.ts` is a shim
  around `src/lib/solver/`, the planner the app itself runs, so that one file may
  import `src/lib/solver/` and nothing else out of `src/lib`.
  `independence.spec.ts` encodes the exception by name. It buys nothing else —
  that file, like every candidate, still may not touch the judge, the feasibility
  rule or the checks.

  Note the direction that leaves. Production calls the planner
  (`src/lib/optimizer-core.ts` calls the same `solveWith` on the same loaded
  module the shim does), so the shipped planner and the measured one are one code
  path. A candidate importing `src/lib` would close that loop the other way and
  measure the app grading itself.
- **Be deterministic.** Same problem in, same allocation out. If your method is
  stochastic, seed it from the problem, not from a clock or a global. You do not
  need to memoize: the harness caches plans by problem content, so the repeated
  solves the checks perform reach you once.
- **Do not read the seed, the instance label, or anything outside `PlanProblem`.**
  It is the whole input.
- **Do not mutate `problem`.** It is shared across the checks in a sweep.

### Self-reporting

`reported` is optional. Supplying it opts you into two extra checks:

- **C2-honesty** — your `jointProbability` must match what the judge computes
  for your own allocation. Failing this means your search is steering by a
  number that is not the objective.
- **C3-joint-product** — your `perTarget` factors must multiply to your
  `jointProbability`.

Omitting `reported` is legal and costs nothing else. Nothing you report is ever
used as your score.

## What gets measured

**Correctness**, as invariant violations. Every invariant is a property that
holds without knowing the optimum, so none of them needs a reference answer:

| group | asserts |
| --- | --- |
| **C0** contract | the returned allocation has one entry per option, and every entry is a non-negative whole number |
| **C1** feasibility | the plan fits the fuel tank and packs into the slots |
| **C2/C3** honesty | the probability you report is the one the judge computes for the allocation you returned, and your per-target factors multiply to it (opt-in) |
| **A** monotonicity | relaxing the problem cannot make your answer worse. More fuel, more time, more ships on the menu, more inventory, a higher crafting level, a shorter launch-period floor, one fewer target: each of those is solved alongside the original, and the relaxed solve must not score below it |
| **B** invariance | restating the same problem must not move the answer at all. Shuffling the menu, reversing the target list, multiplying every fuel cost and the tank by the same constant, appending a duplicate of an option already on the menu, or simply solving twice |
| **M** cross-path | the joint answer must not beat the product of the per-target optima (M1); a solo solve of one target must reach at least what the joint plan already reaches on that target (M2); and the joint answer must not lose to the union of per-target plans solved on split budgets (M3) |
| **D** local optimality | your plan cannot be improved by a small edit to itself. D1 tries every *pair* — remove up to 2 launches of one option in the plan, add up to 2 of some other option — and D2 tries two such pairs at once. If any of those edits is feasible and scores better, the returned plan was not even a local optimum |

**Quality**, as the judged joint probability on the unperturbed instance,
reported in log10 and compared head-to-head against the other entries. This is
the only relative measure; everything else is absolute.

**Latency**, as median/p90/max of a single solve.

### Comparisons are in log space

A four-target plan on a mediocre fleet lands around `1e-13`. The tolerance in
this harness is an absolute number of **nats** on `log(joint)`, so a drop from
`1e-13` to `1e-14` is 2.30 nats and reads exactly as loudly as `0.5 -> 0.05`.
Probability zero is `-Infinity`, so returning nothing where another solver
returns `1e-13` is a failure rather than a rounding artefact.

## Running it

```sh
pnpm arena                                  # smoke: 4 instances, whole roster
ARENA=sweep pnpm arena                      # 40 instances, cheap checks
ARENA=deep pnpm arena                       # + D1/D2 local optimality
SOLVER=my-solver ARENA=sweep pnpm arena     # one entry
ARENA_INSTANCES=80 ARENA_SEED_BASE=9000 ARENA=sweep pnpm arena
pnpm arena:check                            # independence guard only
```

The sweep is opt-in and `pnpm test` does not run it: every tier here is minutes
at best, and the suite people run before a commit has to stay usable. `ARENA` is
the switch — `pnpm arena` sets it, and `vitest.config.ts` drops
`invariants.spec.ts` from the selection when it is unset, so the default suite
does not even pay to import the roster's wasm. `arena:check` is static and fast,
so the independence guard does run with the rest of the tests.

Per-solver JSON lands in `results/<solver-id>.json`, which is gitignored — every
sweep rewrites it, so re-run rather than expecting a committed reference.

**Gating.** `C0-contract` and `C1-feasibility` hard-fail: a plan that is not a
plan is broken outright, and that is not a matter of degree. Every other
invariant is reported rather than thrown, because what the arena measures is how
far a candidate is from holding them — a suite that aborts on the first
monotonicity wobble stops producing a scorecard and starts producing a stack
trace. `ARENA_GATE=all` promotes the rest to failures, for a candidate that is
meant to hold them.

**Cost.** A 40-instance cheap sweep is at least 15 minutes (heavily dependent on
solver runtime); the deep tier adds substantially more. Instances range from 63
to 285 options and from 1 to 4 targets.

## The roster

| id | what it is |
| --- | --- |
| `highs` |The currently shipped solution. See `src/lib/solver/SPEC.md` for more details|

The arena is not a bake-off between methodologies. It is the bar a change to the
shipped planner has to clear before it lands.

What each entry actually scored is written up alongside that entry rather than
here, so a candidate's brief stays a statement of the rules.
