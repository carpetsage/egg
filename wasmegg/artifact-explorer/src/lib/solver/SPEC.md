# The plan as a mixed-integer program

The shipped planner. `src/lib/optimizer-core.ts` calls `solveWith` from `oa.ts`
on a module loaded by `loadHighs`, and the invariant arena enters the same pair
through a shim (`src/oracle/arena/solvers/highs/`), so the solver users run and
the solver the harness measures are one code path. `src/oracle/arena/ARENA.md`
states the problem; this file states the method.

The whole problem — mission counts per slot, crafts as flow over the
conservation polytope, fuel, packing — is stated as a single mixed-integer
program and handed to branch-and-bound. The one thing that cannot be stated
directly is the objective's `log(1 - e^-s)`, which is handled by **outer
approximation**: hold each target's contribution under a family of its tangents
and solve the resulting MILP. The grid is stated once, up front; there is exactly
one MILP per plan.

Section numbers are referenced from code comments throughout `src/lib`. They are
stable; add rather than renumber.

## 1. Preprocessing

`model.ts` takes the downward closure of the targets, normalizes fuel to a budget
of 1 and time to a per-slot budget of 1, drops options that cannot fit a slot or
carry nothing useful, and merges exact duplicates into groups under a numeric
canonical key.

The merge is why menu order and injected duplicates are structurally inert
(arena B1, B6) and why fuel rescaling is exact rather than tolerated (B3): the
model never sees the raw menu, so there is nothing for those perturbations to
move.

## 2. Columns

`N[g]` (missions of group `g` summed over slots) is redundant as modelling — one
row pins it to the `n` columns — and load-bearing as arithmetic. Every row that
does not care *which* slot a mission went into reads `N` rather than the three
`n` columns, taking those rows from `3G` nonzeros to `G`. It stays continuous:
integrality of the total follows from the parts, and making it integer would give
branch-and-bound a fourth column per group to branch on.

`c` (crafts) stays continuous deliberately. The judge re-optimises the craft
split as an LP for whatever allocation it is handed, so integralising crafts here
would be optimising a different objective from the one being graded.

### `craftUpperBounds`

Obtained by interval propagation over the recipe: the most of an item that can
exist is what is owned plus what every mission could drop at its maximum count
plus what could be crafted of it, and the most of a node that can be crafted is
the smallest of those supplies divided by the recipe quantity. What the
propagation drops is *aggregate competition* — each group is counted at the
maximum it could reach with the whole tank and every slot to itself, and two
parents drawing on one ingredient are each given all of it. Both approximations
over-state supply, so the result is a relaxation and cannot cut off a feasible
point. It is not floored, because `c` is continuous and 2.5 crafts is a reachable
point.

The conservation rows already imply all of this, but only through a chain one
tier at a time. Handing the bound over directly was measured at 26% of the solve
on a two-target production instance (1553ms to 1146ms, identical plan). That
predates turning presolve off, and the bound matters more without it, not less:
presolve was the thing that could have derived the chain. It was found by
accident — adding a *deliberately slack* golden egg row sped the solver up by a
similar margin, and that row turned out to be the only thing that had ever
bounded these columns.

## 3. Rows

Two rows are the reason to reach for a MILP at all.

**`slot_k` is the packing constraint, stated** — three rows, one per slot, rather
than a volume bound on the total that a repair pass has to make true afterwards.
A plan that solves this model packs by construction, and the assignment is the
packing witness.

**`score_t` puts the craft split in the same matrix**, so the solver trades a
mission for a craft directly rather than choosing missions first and accounting
for crafts afterwards.

The slot rows are in raw seconds rather than normalized because HiGHS accepts an
integer solution violating a row by up to `mip_feasibility_tolerance`, which is
absolute on the row activity: a normalized row would license overfilling a slot
by that fraction of the entire horizon — seconds of it on a month-long budget —
while the judge's packer works to 1e-9 absolute seconds. The tolerance is pinned
to 1e-9, three orders below the HiGHS default, so the two are on one scale.

`goldenEggs` is written only when the caller supplies a budget. `price_p` is a
*linear* stand-in for a curve that decreases in the craft index — the player's
next craft of `p`, the dearest one the plan can make — so the row's activity is
an upper bound on the real bill and a plan that satisfies it is always
affordable. The converse does not hold: a plan leaning many crafts on one node is
over-charged and can be rejected despite fitting. Raw golden eggs, not
normalized: prices run 1e2-1e7 against capacities of 1e6-1e10, mid-window at both
ends.

`order_k` forces slot loads non-increasing. Without it every plan appears
`slots!` times and the tree spends its budget rediscovering relabellings.

### Row scaling, and the ingestion window

HiGHS discards any matrix entry at or below `small_matrix_value` (default 1e-9)
while *ingesting* a model. A discarded entry does not weaken a row, it deletes a
term: lose the coefficients from the fuel row and the fuel budget stops existing,
and nothing anywhere says so. The margin is not comfortable — fuel costs are
normalized by the tank, the smallest observed across the arena sweep is 2e-8, and
the arena's A1-fuel check doubles the tank, which halves that.

**Setting the option is not the fix.** The wasm build's `solve(text, options)`
writes the model to its virtual filesystem, calls `Highs_readModel`, and only
*then* applies the options, so every option governing ingestion
(`small_matrix_value`, `large_matrix_value`, `infinite_bound`) is set too late and
silently does nothing. Options governing the solve apply normally.

So `Rows.end` scales instead — multiplying a row and its bounds by a positive
constant leaves the feasible set exactly unchanged. Rows already clear of the
filter are untouched, the slot rows in particular, whose units were picked to
line up with the judge's packer.

The other end of the window bounds that scaling. HiGHS *rejects* a model carrying
an entry above `large_matrix_value` (default 1e15) — "Unable to read LP model ...
HiGHS error -1" out of the reader, surfacing in the app as a plan that could not
be computed at all. A tangent cut placed deep in the grid can have a slope ratio
of ~1e17 between its two coefficients, so normalizing the small side to 1 would
put the other at ~2.8e16 and make the model unreadable. Hence
`min(1/smallest, SAFE_LARGE_COEFFICIENT/largest)`. A row whose own dynamic range
is wider than the window still cannot be made to fit; the least bad answer is to
keep its large entries readable. The property to hold is over every emitted entry
— all of them inside [1e-9, 1e15] — not over any one instance.

## 4. Scaling: why `sigma` and not `s`

Scores here run to `s ~ 1e-13` and `g'(s) ~ 1/s`, so tangent cuts written
directly in `s` would carry slopes around 1e13 — a matrix no amount of solver
quality rescues.

Every target is therefore measured in units of its own ceiling. `theta_t` is the
largest score target `t` can reach when every other target is ignored and counts
are allowed to be fractional (one continuous LP per target, `scaleLps`). Then
`sigma_t = s_t / theta_t` lies in `[0, 1]` and a tangent at `sigma = a` has slope
`1/a` rather than `1/s`. The grid is stated up front and bottoms out at
`SIGMA_FLOOR`, so no tangent coefficient exceeds `1/SIGMA_FLOOR`. Nothing is
added while solving, which is what makes that a bound rather than a hope.

`theta_t <= 0` means no allocation scores that target at all, so the joint
probability is zero for every plan and the empty one is as good as any; it is
returned directly. A `sigma_t` of exactly zero produces no cut, because there is
no tangent at zero — when the model wants to abandon a target outright, the
deepest existing cut is what prices that decision, which is what makes the
grid's floor load-bearing rather than decorative.

### The scale LP's objective weight

Every other objective here is O(1); the scale LP maximizes a *raw* score, and raw
scores run to 1e-7 and below. `dual_feasibility_tolerance` is absolute on reduced
costs, so at that magnitude every reduced cost at the all-zero vertex is inside
tolerance and HiGHS reports optimal at zero — with no warning — while a feasible
point three decades better sits in the same polytope. A zero `theta` reads as
"this target is unreachable" and returns an empty plan.

The fix is structural rather than a looser bound: `SCALE_LP_OBJECTIVE` multiplies
every reduced cost by 1e9. Scaling an objective does not move its argmax and
`theta` is read off the *column* rather than the objective value, so it costs
nothing. `dual_feasibility_tolerance` is tightened one order alongside it, and
only one: at HiGHS's documented minimum of 1e-10 the simplex fails outright,
returning `HiGHS error -1` from `Highs_run`.

### Two constants that are not the judge's

`concave.ts` exports `gPrime`, which clamps at 1e12 so the Frank-Wolfe
linearizations stay finite. The cut generator must **not** reuse it: at
`s ~ 1e-13` the clamp would be active at every tangent point at once, so every
cut would come back with the identical slope and the outer approximation would
carry no curvature at all.

`Q = -log(1 - p)` is `+Infinity` when a craft is certain, and infinity cannot
enter a matrix. `Q_CERTAIN_PROXY` is large enough that one craft saturates `g` to
every bit of a double. Every matrix reads that one constant — this MILP and the
seed LP `optimizer-core.ts` compiles for the reported craft split — so a plan is
never chosen against one value of certainty and priced against another. The judge
(`evaluator.ts`) still sees the real Infinity; the proxy only steers.

## 5. The pass

One MILP under a fixed tangent grid, then decode, then judge.

The grid is log-spaced in units of theta because `sigma` is "fraction of
achievable": the thirteen decades the scores span live in theta, which the
normalization divides out. Envelope error is `(d ln10)^2 / 8` nats at `d` decades
per cut (`envelopeErrorNats`), which is what sizes the point count.

`SIGMA_FLOOR` is one decade below anything ever measured: over 2754 sigma values
(39 instances x 27 tuning configs) none fell below 0.163, with p1 at 0.22 and a
median of 0.54. An earlier floor of 1e-5 spent roughly three and a half of its
five decades of grid where no plan has ever landed — rows bought and never used.
The band is conditioned on the instance generator, so a materially different
fleet or target mix is a reason to re-measure it rather than to trust it.

**There used to be a refinement loop here**, adding a cut per target at the
MILP's own `sigma*` and at the judged score. It was removed on measurement, not
for being redundant with a finer grid: a placebo round solved against a
row-permutation of the identical cut set — same polytope, same optimum, no new
information — changed the answer on 17 of 39 instances and kept 42% of real
refinement's gain. What the second round bought was mostly a search restart, not
a tighter envelope, and the same budget spent on branch-and-bound nodes in one
pass buys more.

What comes back is a *judged* plan, never the MILP's answer taken on faith. The
incumbent is scored by `evaluator.ts`, an independent re-derivation of the
objective, so the linearized model steers and the real objective decides — the
outer approximation never grades itself. A plan the empty plan beats is dropped:
a node-limited search can return an allocation scoring probability zero, and the
empty one at least spends nothing to do that.

## 6. Decode and certify

Both budgets are rows of the model, so a decoded plan is feasible by
construction; `certifies` says so out loud rather than assuming it. It re-checks
the fuel row against the rounded counts and reads the three slot loads straight
off the MILP's own columns — the packing witness that summing over slots threw
away.

`SLOT_TOL` is not chosen for resolution; the drift it has to absorb is three
decades smaller and measures zero in practice. It is the judge's own packing
tolerance, and a ceiling rather than a preference: certifying to anything looser
would accept plans the judge calls infeasible, which is an arena C1 hard failure.

It is a verifier, not a repairer. An incumbent that fails is dropped, not
patched: the caller keeps the previous judged plan, and the worst case is the
empty plan, which is feasible and honest.

## 7. Budgets, and why they are counts

Every budget here is a **count**, never a number of seconds — not in the app and
not in the arena. A wall-clock limit would make the returned plan a function of
how loaded the machine was, which breaks determinism outright: the same inputs
would give a user two different plans on two runs, and the arena could not grade
a candidate it cannot reproduce. For the same reason `SOLVER_OPTIONS` pins
`threads: 1`, `parallel: 'off'` and `random_seed: 0` — a parallel MIP search is
not reproducible. There is no `Math.random`, no `Date.now` and no environment
read anywhere in this directory.

`DEFAULT_TUNING` was chosen by three 40-instance arena campaigns on separate seed
bases, because a single campaign cannot resolve a delta this size: the same
tuning's severity swings 3x across seed bases while the harness itself reproduces
exactly. Treat any single-campaign delta under about 1.5x as noise. Two further
findings from those sweeps are worth not re-deriving: quality is flat across
every tuning ever swept (all means inside 0.005 log10), so these are monotonicity
and latency decisions rather than quality ones; and `maxNodes: 0` returns
probability zero on *every* instance even at `mip_heuristic_effort: 1.0`, because
the root heuristics never find an incumbent.

## 8. The backend

`highs.ts` loads `highs` (lovasoa/highs-js), HiGHS compiled to WebAssembly —
the build that can ship, since `artifact-explorer` is a browser app and a native
addon cannot go there. The module exposes one entry point taking a model in
CPLEX LP format, so every solve serializes the matrix to text and has HiGHS parse
it back. Ingestion plus the solution round trip is 12-35 ms per call, which is
75-85% of a *continuous* solve but under 5% of an expensive MILP one; building
the text in JS is 0.1-1.2 ms even on the widest instance.

Asset resolution is why this is a loader function rather than a bare import. Left
alone the Emscripten glue looks for `highs.wasm` beside itself, which is right
under Node and wrong inside a bundled worker; handing it the URL from
`import wasmUrl from 'highs/runtime?url'` lets Vite emit and fingerprint the file
like any other asset.

Two properties of the text interface are worth knowing, both silent when got
wrong:

- Options are applied *after* `Highs_readModel`, so nothing governing ingestion
  takes effect (section 3).
- A solution's `Index` field is the column's position *in the LP file*, which is
  the order the reader first saw it, not the order the model built its columns
  in. Mapping through `Index` type-checks, runs, and reads the wrong columns.

### Presolve, and the throw it used to cause

`SOLVER_OPTIONS.presolve` is `'off'`. Presolve is a performance bet and on this
workload it loses: over twelve arena instances through `optimizeFull`, timed with
the config order forward and reversed, turning it off was 11% faster at the
pinned tolerances and 17% faster at a stock MIP tolerance — with an *identical*
joint probability on 12 of 12 instances, to the last bit. Structurally it does
very little here (rows -3% to -6%, nonzeros between -0.6% and *+1.8%*); what it
buys is implied-integer detection and restarts, and what it costs is search —
5058 LP iterations against 2348, with sub-MIP calls eating 3.47s of a 4.73s
solve.

**Turning it off also removed a failure path.** HiGHS can fail inside *presolve*
on a model it reads and solves perfectly well without it, throwing "HiGHS error
-1" out of `Highs_run` — not out of the reader, so this is not the ingestion
window of section 3. Re-solving a rejected model one option at a time says the
trigger is `mip_feasibility_tolerance` at 1e-9, which is the interaction
ERGO-Code/HiGHS#1578 reports: presolve calling a model infeasible that solves to
optimality without it, once that tolerance is tightened. That issue's threshold is
1e-7 and `SOLVER_OPTIONS` pins two orders tighter. (#907, #2171 and #2173 are the
same shape without the tolerance angle.)

`random_seed: 1` also clears it, which says this is a knife-edge numerical
coincidence rather than anything structural — and is why the seed is not the fix,
since it would settle this instance and silently pick a different one to fail on.
Of the knobs that work, presolve is the only one that solves the model with every
tolerance still at its pinned value; loosening `mip_feasibility_tolerance`
instead would weaken, on *every* solve, the guard that keeps HiGHS's integer
solutions on the judge's packing scale. Nothing gentler is available either —
`presolve_reduction_limit` and `presolve_rule_off` are not in this package's
typings, and of the three values it does expose, `'choose'` still throws.

Presolve only reformulates; it cannot change the feasible set, so running without
it can turn a failure into an answer but never a wrong answer into a
right-looking one.
