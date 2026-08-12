# The plan as a mixed-integer program

This directory is the shipped planner. `src/lib/optimizer-core.ts` calls
`solveWith` from `oa.ts` on a module loaded by `loadHighs`, and the invariant
arena enters the same pair through a shim (`src/oracle/arena/solvers/highs/`),
so the solver users run and the solver the harness measures are one code path.
`src/oracle/arena/ARENA.md` states the problem and the rules; this file states
the method.

The method is to stop searching and start *stating*: write the whole problem —
mission counts per slot, crafts as flow over the conservation polytope, fuel,
packing — as a single mixed-integer program, hand it to a branch-and-bound
solver, and take back the answer.

The objective is not linear, so the one thing that cannot be stated directly is
`log(1 - e^-s)`. That is handled by outer approximation: hold each target's
contribution under a family of tangents, solve the resulting MILP, add tangents
where the answer landed, repeat. Every model in the sequence over-estimates, so
its optimum is an upper bound on the true one, and the bound tightens
monotonically as cuts accumulate.

## Module layout

```text
model.ts       # restricted DAG, normalized budgets, merged option groups
milp.ts        # the model itself — columns, rows, cuts, decode
oa.ts          # the outer-approximation loop, and the certificate
evaluator.ts   # judge-equivalent value of an integer allocation
simplex.ts     # the LP the evaluator prices craft splits with
highs.ts       # the wasm loader, and the LP text either way through it
types.ts       # the plan seam and the MILP seam, including `SOLVER_OPTIONS`
SPEC.md        # this file
```

The arena's shim is the only file under `solvers/` allowed to import any of
this, and only this; `pnpm arena:check` enforces the direction, one way. Nothing
here imports the judge, the arena's packer or its checks.

## 1. Preprocessing

`model.ts`: downward closure of the targets, one conservation row per consumed
item, fuel normalized to a budget of 1 and time to a per-slot budget of 1,
options that cannot fit a slot or carry nothing useful dropped, options with a
non-finite or negative cost dropped, exact duplicates merged into groups under a
numeric canonical key, per-group count caps. The search is over groups, so menu
order and injected duplicates are structurally inert (B1, B6) and fuel rescaling
is exact rather than tolerated (B3): the model never sees the raw menu.

## 2. Columns

| column | count | type | meaning |
| --- | --- | --- | --- |
| `n[g][k]` | groups x slots | integer | missions of group `g` launched into slot `k` |
| `N[g]` | groups | continuous | the same missions summed over slots |
| `c[p]` | craftables | continuous | crafts of node `p` |
| `sigma[t]` | targets | continuous | target `t`'s score, in units of `theta_t` |
| `z[t]` | targets | continuous | the stand-in for `g(s_t)`; objective coefficient 1 |

`N[g]` is redundant as modelling — it is pinned to the `n` columns by one row
each — and load-bearing as arithmetic. Every row that does not care *which* slot
a mission went into (conservation, scores, fuel) reads `N` rather than the three
`n` columns, which takes those rows from `3G` nonzeros to `G`. Integrality of
the total follows from the parts, so `N` stays continuous rather than giving
branch-and-bound a fourth column per group to branch on.

`c` stays continuous deliberately. The judge re-optimises the craft split as an
LP for whatever allocation it is handed, so integralising crafts here would be
optimising a different objective from the one being graded.

`z` is bounded above by 0 before any cut is added, because `g(s) = log(1 - e^-s)`
is the log of a probability.

`c` carries an explicit upper bound per column (`craftUpperBounds` in
`model.ts`), obtained by interval propagation over the recipe: the most of an
item that can exist is what is owned plus what every mission could drop at its
maximum count plus what could be crafted of it, and the most of a node that can
be crafted is the smallest of those supplies divided by the recipe quantity.
"Maximum count" is `group.cap`, which is already `min(floor(1/fuel),
floor(slots/time), GROUP_CAP)` — so fuel, time and the slot count do enter the
bound, per group. What the propagation drops is *aggregate competition*: each
group is counted at the maximum it could reach if it had the whole tank and every
slot to itself, and two parents drawing on one ingredient are each given all of
it. Both approximations over-state supply, so the result is a relaxation and
cannot cut off a feasible point.

It is not floored: `c` is continuous, so 2.5 crafts is a reachable point and a
floored bound would remove it.

The conservation rows already imply all of this — but only through a chain, one
tier at a time, which bound propagation has to walk. Handing the bound over
directly was measured at 26% of the solve on a two-target production instance
(1553ms to 1146ms, identical plan). That measurement predates turning presolve
off in `SOLVER_OPTIONS`, and the explicit bound matters more without it, not
less: presolve was the thing that could have derived the chain. It was found by accident: adding a
*deliberately slack* golden egg row sped the solver up by a similar margin, and
the row turned out to be the only thing that had ever bounded these columns.

## 3. Rows

```text
aggregation      N_g - sum_k n_{g,k}                              =  0
conservation_i   sum_p cons[i][p] c_p - sum_g yield_g[i] N_g     <=  baseB_i
score_t          theta_t sigma_t - Q_t c_{target t}
                                 - sum_g leg_g[t] N_g             =  0
fuel             sum_g fuel_g N_g                                <=  1
goldenEggs       sum_p price_p c_p                               <=  craftBudget
slot_k           sum_g seconds_g n_{g,k}                         <=  timeCapacity
order_k          sum_g seconds_g (n_{g,k} - n_{g,k+1})           >=  0
cut(t, a)        z_t - theta_t g'(theta_t a) sigma_t             <=  g(theta_t a)
                                                                     - theta_t g'(theta_t a) a
```

Two of these are the reason to reach for a MILP at all.

**`slot_k` is the packing constraint, stated.** Not a volume bound on the total
that a repair pass has to make true afterwards — three rows, one per slot,
saying exactly what the game says. A plan that solves this model packs by
construction, and the assignment itself is the packing witness.

Those rows are in raw seconds rather than normalized, which is not cosmetic.
HiGHS accepts an integer solution violating a row by up to
`mip_feasibility_tolerance`, which is absolute on the row activity; a normalized
row would license overfilling a slot by that fraction of the entire horizon —
seconds of it on a month-long budget — while the judge's packer works to 1e-9
absolute seconds. Stating the row in the judge's units puts the two tolerances
on the same scale. The tolerance itself is pinned to 1e-9 in `SOLVER_OPTIONS`,
three orders below the HiGHS default, for the same reason: an infeasible plan is
a hard arena failure, not a difference of opinion about rounding.

**`score_t` makes the craft split part of the same optimisation.** The
conservation polytope and the mission counts are in one matrix, so the solver
trades a mission for a craft directly rather than choosing missions first and
accounting for crafts afterwards.

`goldenEggs` is optional and written only when the caller supplies a budget and
at least one craftable carries a positive price; without it the plan is priced
after the fact and never constrained. `price_p` is a *linear* stand-in for a
curve that decreases in the craft index — the player's next craft of `p`, the
dearest one the plan can make — so the row's activity is an upper bound on the
real bill and a plan that satisfies it is always affordable. The converse does
not hold: a plan leaning many crafts on one node is over-charged and can be
rejected despite fitting. Raw golden eggs, not normalized: prices run 1e2-1e7
against capacities of 1e6-1e10, which sits mid-window at both ends.

The row binds on this model alone, which is not where the reported bill comes
from. `optimizer-core.ts` re-derives the craft split downstream, so the same
budget is written into `compileJointInnerLp` and the LP inside
`refineJointCraftSplit`; see OPTIMIZER.md.

`order_k` breaks the slot symmetry by forcing slot loads non-increasing. Without
it every plan appears `slots!` times and the tree spends its budget rediscovering
relabellings.

### Row scaling, and the ingestion window

HiGHS discards any matrix entry at or below `small_matrix_value` — default 1e-9
— while *ingesting* a model. A discarded entry does not weaken a row, it deletes
a term: lose the coefficients from the fuel row and the fuel budget stops
existing, and nothing anywhere says so.

The margin is not comfortable. Fuel costs are normalized by the tank, and the
smallest across the arena's 40-instance sweep is 2e-8 (recorded at
`SAFE_COEFFICIENT` in `milp.ts`); the arena's A1-fuel check doubles the tank,
which halves that.

**Setting the option is not the fix.** The wasm build's `solve(text, options)`
writes the model to its virtual filesystem, calls `Highs_readModel`, and only
*then* applies the options — the call order is quoted in `highs.ts`. So every
option governing how a model is ingested (`small_matrix_value`,
`large_matrix_value`, `infinite_bound`) is set too late and silently does
nothing, while options governing the solve — the feasibility tolerances, the node
budget, the seed — apply normally.

So `Rows.end` scales instead. Multiplying a row and its bounds by a positive
constant leaves the feasible set exactly unchanged, so any row carrying an entry
within `SAFE_COEFFICIENT` (1e-6) of the filter is scaled up. Rows already clear
of it are untouched — the slot rows in particular, whose units were picked to
line up with the judge's packer and which would lose that if rescaled.

The other end of the window bounds that scaling. HiGHS *rejects* a model
carrying an entry above `large_matrix_value` (default 1e15), not silently but
with `Unable to read LP model ... HiGHS error -1` out of the reader, which
surfaces in the app as a plan that could not be computed at all. A tangent cut
placed deep in the grid can have a slope ratio of ~1e17 between its two
coefficients, so normalizing the small side to 1 would put the other at ~2.8e16
and make the model unreadable. The scale is therefore the *smaller* of "enough
to clear the bottom" and "as much as the top allows":
`min(1/smallest, SAFE_LARGE_COEFFICIENT/largest)`, with `SAFE_LARGE_COEFFICIENT`
at 1e12 — the same 1000x margin `SAFE_COEFFICIENT` keeps below 1e-9. A row whose
own dynamic range is wider than the window still cannot be made to fit; the least
bad answer is to keep its large entries readable.
The property to hold is over every emitted entry — all of them inside
[1e-9, 1e15] — rather than over any one instance.

## 4. Scaling: why `sigma` and not `s`

Scores here run to `s ~ 1e-13`, and `g'(s) ~ 1/s`. Tangent cuts written directly
in `s` would therefore carry slopes around `1e13`, which is a matrix no amount of
solver quality rescues.

So every target is measured in units of its own ceiling. `theta_t` is the largest
score target `t` can reach when every other target is ignored and the counts are
allowed to be fractional — one continuous LP per target (`scaleLps`, solved
by the same backend). Then `sigma_t = s_t / theta_t` lies in `[0, 1]` for every
feasible plan, and a tangent at `sigma = a` has slope `1/a` rather than `1/s`.
With the initial grid bottoming out at `1e-7`, its coefficients stay under `1e7`;
refinement cuts may go deeper, down to `CUT_FLOOR = 1e-12`, so the largest
coefficient the matrix can carry is around `1e12` — inside the ingestion window,
and the reason that floor is a constant rather than "as deep as the search asks".

`theta_t <= 0` for any target means no allocation scores that target at all, so
the joint probability is zero for every plan and the empty one is as good as any.
That is returned directly.

A `sigma_t` of exactly zero produces no cut, because there is no tangent at zero:
when the model wants to abandon a target outright, the deepest existing cut is
what prices that decision. The grid's `1e-7` point is load-bearing rather than
decorative.

### The scale LP's objective weight

Every other objective here is O(1) — the OA MILP maximizes a sum of
log-probabilities. The scale LP is the exception: what it maximizes is a *raw*
score, and raw scores run to 1e-7 and below. HiGHS's
`dual_feasibility_tolerance` is absolute on reduced costs, so at that magnitude
every reduced cost at the all-zero vertex is inside tolerance and HiGHS reports
optimal at zero — with no warning — while a feasible point three decades better
sits in the same polytope. A zero `theta` reads as "this target is unreachable",
which returns an empty plan.

The fix is structural rather than a looser bound: the scale LP's objective column
carries a weight of `1e9` (`SCALE_LP_OBJECTIVE`). Scaling an objective does not
move its argmax, and `theta` is read off the *column* rather than the objective
value, so this costs nothing and multiplies every reduced cost by 1e9.
`dual_feasibility_tolerance` is tightened one order alongside it, and only one:
at HiGHS's documented minimum of 1e-10 the simplex fails outright on the wider
instances, returning `HiGHS error -1` from `Highs_run`.

### Two constants that are not the judge's

`evaluator.ts` exports `gPrime`, which clamps at `1e12` so the judge's
Frank-Wolfe linearizations stay finite. The cut generator does **not** use it and
computes `1 / expm1(s)` uncapped instead. Reusing the clamp would be a bug rather
than a shortcut: at `s ~ 1e-13` the clamp is active at every tangent point at
once, so every cut would come back with the identical slope and the outer
approximation would carry no curvature at all.

`Q = -log(1 - p)` is `+Infinity` when a craft is certain. Infinity cannot enter a
matrix, so certainty is proxied by `Q = 1e4` (`Q_CERTAIN_PROXY`), large enough
that one craft saturates `g` to every bit of a double. The judge still sees the
real Infinity; the proxy only steers.

## 5. The loop

```text
theta   <- one LP per target
cuts    <- log-spaced grid, 15 points per target, 1 down to 1e-7
best    <- the empty plan

repeat maxRounds times:
    solve the MILP under the current cuts
    counts  <- round the n columns, sum over slots
    value   <- evaluator on counts
    keep counts if certifies(counts) and value beats best   # see section 6
    stop if the MILP was proven optimal and its bound is within 1e-6 nats of best
    add a cut per target where the MILP thinks the plan landed
    add a cut per target where it actually landed
    stop if neither added anything new
```

The grid is log-spaced because the scores span thirteen decades; a linear grid
would put every point in a regime no plan reaches. Two cut points within `1e-3`
of each other relatively are the same cut and the later one is dropped.

Refining at *both* points matters. The MILP's own `sigma*` is where the outer
approximation is loose, which is what makes the next bound tighter; the judged
score is where the plan really is, which is the value the next round has to beat.
A round whose incumbent fails the certificate still refines from where it landed,
so it steers even though it cannot win.

What the loop returns is the best judged iterate, never the last one. Every
incumbent is scored by `evaluator.ts`, a re-derivation of the objective, so the
linearized model steers and the real objective decides. The outer approximation
never grades itself.

## 6. Decode and certify

Counts come out of the `n` columns rounded and summed over slots, then clamped to
the group's cap. Both budgets are rows of the model, so a decoded plan is
feasible by construction; `certifies` says so out loud rather than assuming it.
It re-checks the fuel row against the rounded counts and reads the three slot
loads straight off the MILP's own columns — the packing witness the
sum-over-slots threw away — against tolerances of 1e-9 relative on fuel and 1e-9
absolute seconds on a slot.

The slot figure is not chosen for resolution; the drift it has to absorb is
three decades smaller and measures zero in practice. It is the judge's own
packing tolerance, and it is a ceiling rather than a preference: certifying to
anything looser would accept plans the judge calls infeasible, which is a C1
hard failure. Same scale as the pinned feasibility tolerances and the raw-seconds
slot rows, for the same reason.

It is a verifier, not a repairer. An incumbent that fails is dropped, not
patched: the caller keeps the previous judged plan, and the worst case is the
empty plan, which is feasible and honest.

The self-report (`reported`) is the exact-precision evaluation of the returned
counts, which opts the entry into the arena's C2-honesty and C3-joint-product
checks.

## 7. Budgets, and why they are counts

The two levers are `maxRounds` (refinement rounds, each a full MILP solve) and
`maxNodes` (branch-and-bound nodes per solve), plus a relative MIP gap of 1e-6.
`DEFAULT_TUNING` in `oa.ts` is `{maxRounds: 2, maxNodes: 5}`, and it is what
ships.

Every budget here is a **count**, never a number of seconds — not in the app and
not in the arena. A wall-clock limit would make the returned plan a function of
how loaded the machine was, which breaks determinism outright and would make the
sidebar's search-effort control a knob that silently lies. For the same reason
`SOLVER_OPTIONS` pins `threads: 1`, `parallel: 'off'` and `random_seed: 0`: a
parallel MIP search is not reproducible. There is no `Math.random`, no
`Date.now` and no environment read anywhere in this directory.

What the budgets are worth is measured in `RESULTS.md`.

## 8. The backend

`types.ts` defines the whole interface between the loop and the solver: a matrix,
a node budget and a gap, a solution. There is exactly one implementation.

**`highs.ts`** loads `highs` (lovasoa/highs-js), HiGHS compiled to WebAssembly.
That is the build that can ship: `artifact-explorer` is a browser app, and a
native addon cannot go there. The wasm module exposes one entry point taking a
model in CPLEX LP format, so every solve serializes the matrix to text
(`writeLp`) and has HiGHS parse it back, then reads the answer out of the
returned column records. That round trip is a small fraction of an expensive MILP
solve; what it costs is measured in `RESULTS.md`.

The loader is async and the plan seam is not, so `loadHighs()` returns a promise
the app awaits per solve and the arena entry awaits at import time. One module
instance per realm is cached — the wasm is 3.4MB — and a rejected load clears the
cache so a dropped fetch does not disable the planner for the session. Nothing is
stateful across solves.

Asset resolution is why this is a loader function rather than a bare import. Left
alone the Emscripten glue looks for `highs.wasm` beside itself, which is right
under Node and wrong inside a bundled worker; handing it the URL from
`import wasmUrl from 'highs/runtime?url'` lets Vite emit and fingerprint the file
like any other asset. Under Node that URL arrives as a `/@fs/...` dev path and
the prefix has to come back off (with the leading slash too, ahead of a Windows
drive letter).

Two properties of the text interface are worth knowing, both silent when got
wrong:

- Options are applied *after* `Highs_readModel`, so nothing governing ingestion
  takes effect (section 3).
- A solution's `Index` field is the column's position *in the LP file*, which is
  the order the reader first saw it, not the order the model built its columns
  in. Mapping through `Index` type-checks, runs, and reads the wrong columns.
  `readSolution` maps through the column name.
