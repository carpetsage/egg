# The Path of Virtue mission optimizer

Given a player's ships, a fuel budget and a per-slot time horizon, the optimizer
picks integer counts of each launch option so as to maximize the chance of
ending up with a legendary of every artifact the player selected.

The game runs three independent mission slots, so a plan is realizable only if
its mission durations pack into three bins of capacity `S`.

## The objective

Each selected target `T` has a linear score:

```
score_T = Q_T * crafts_T + lambda_T        Q_T = -log(1 - pCraftLegendary_T)
```

`crafts_T` is how many copies of `T` the inventory supports crafting, and
`lambda_T` is `T`'s expected direct legendary drop count from the plan's
missions. With that definition `1 - e^(-score_T)` is exactly
`P(at least one legendary T)`.

The search maximizes

```
F = sum_T g(score_T)        g(s) = log(1 - e^-s)
```

so `e^F` is exactly the joint probability of getting a legendary of *every*
selected target — the number the UI reports as the headline for a multi-target
plan.

### A single target is not a special case

There is no separate single-target objective, and no weighted-sum mode. `g` is
strictly increasing, so with one target `argmax F = argmax score_1`. Maximizing
a plain weighted-sum score *is* this problem with one term. The same code path
runs at every target count.

The MILP needs only that `F` is concave and non-decreasing in inventory, which is
what makes the tangent family a valid outer approximation at any target count.
Each `score_T` is concave and non-decreasing, `g` is concave and non-decreasing,
a non-decreasing concave function of such an argument stays concave and
non-decreasing, and a sum of those keeps both properties. An extra target is one
more score column, one more epigraph column and one more block of tangent rows —
not a different method.

### Convergence is measured in probability space

`F` is a log-probability, so `F <= 0` and a *relative* gap on `F` would be
meaningless. Every convergence test is stated in probability space, where
`P = e^F`: `relativeProbGap(upper, best) = 1 - e^(best - upper)` is the relative
probability shortfall of settling for `best`.

One consequence worth knowing: `g` flattens as `score_T` grows
(`g'(s) = 1/(e^s - 1)`), so once a target is all but certain the search stops
distinguishing plans that differ only in how much further they overshoot it.
That is correct behaviour — at `P_T = 0.999` the next craft buys nearly nothing,
and with several targets that budget belongs to whichever one is still short —
but it does mean near-saturated instances settle for any plan inside the epsilon
band rather than the score-maximal one.

## The tangent epigraph LP

`sum_T g(score_T)` is not linear, but `g` is concave, so every tangent line to
`g` lies on or above it, with equality at the tangent point. Introducing one
epigraph variable `z_T` per target with a row

```
z_T <= alpha_k + beta_k * score_T
```

for each breakpoint `k` turns "maximize `sum_T g(score_T)`" into a linear
program: the LP drives each `z_T` up to `min_k(...)`, the tightest bound the
chosen breakpoints allow.

`JOINT_TANGENT_BREAKPOINTS` is the fixed grid of tangent points. It is spaced to
roughly equalize the envelope's probability-space slack over `s` in
`[0.05, 40]`; `g` is nearly flat above `s ~ 4`, so three points cover the tail.
The grid is deliberately small: every row is re-solved millions of times per run
(see `optimizer-perf.spec.ts`).

`EPIGRAPH_SHIFT` exists because `g(s) < 0` for `s < ln 2`, so `z_T` can be
negative, while the LP solver in `lp.ts` assumes `x >= 0`. Shifting every
epigraph row's RHS up by a constant keeps `z_T` positive without changing the
argmax; the objective has `targets.length * EPIGRAPH_SHIFT` subtracted back out
before being returned. Anything building its own epigraph rows — the outer LP
relaxation in `optimizer-core.ts` does — must subtract it too.

### Why the over-estimate is safe

The envelope is an *upper* bound on `g`, so the tangent LP always slightly
**over-estimates** the true joint objective.

This is safe because the approximation is used **only for search ranking and
pruning**. The final numbers the UI reports are never read off it. They are
computed exactly: `alphaToProb` converts each target's craft count and drop rate
into that target's probability, and those are multiplied to get the joint
probability. If you change anything about the tangent grid, this is the property
to preserve — an over-estimate reorders candidates slightly, whereas letting the
approximation leak into reporting would make the tool lie.

### Recovering the exact craft split

The tangent grid starts at `s = 0.05`, and below that its nearest-tangent
approximation of `g` is poor. The split it recovers is therefore biased whenever
a target lands on a tiny craft count — fine for ranking, not acceptable for
reporting.

So the tangent-LP split is used only as a seed. `refineJointCraftSplit`
(`value-function.ts`) then recovers the split that maximizes the *exact* concave
objective `sum_T g(Q_T*craft_T + lambda_T)` at the final chosen inventory, over
the recipe's craft-conservation polytope, by **Frank-Wolfe with an exact line
search**: linearize `g` at the current scores (`weight_T = g'(score_T) * Q_T`,
by the chain rule), maximize the resulting weighted-sum craft LP — the ordinary
`compileInnerLp`, whose polytope is identical — and golden-section search along
the segment from the current point to that vertex. Each iterate's true objective
is non-decreasing and the iteration converges to the polytope optimum. This runs
once per returned solution, never in the search loop.

## Search structure

`optimizeFull` states the whole problem as one mixed-integer program and hands
it to HiGHS. The model, the outer approximation that handles the concave
objective, and the numeric traps in both live in
`src/lib/solver/SPEC.md`; what follows is only what a reader of
this file needs.

**Why a MILP.** The three-slot packing constraint is a genuine bin packing, and
the search this replaced could not see it: everything upstream of its packer
worked in aggregate `3S` time and then projected into three bins, so packing was
a repair step applied to a plan chosen without it. The MILP allocates missions
*per slot* — one row per slot, saying exactly what the game says — so a solution
packs by construction and no repair phase exists. The crafts are continuous
columns over the same conservation polytope, so the craft split is optimised in
the same matrix rather than in an inner LP the outer search re-solves.

**Why it is not a linear program.** `sum_T log(1 - e^-s_T)` is concave and
transcendental. Outer approximation handles it: hold each target's contribution
under a family of its tangents and solve the resulting MILP. The model
over-estimates the true objective, so *when it is solved to proven optimality*
its optimum is an upper bound on the true one — that is a property of the
formulation. It is not a claim about every run: the node budget (`maxNodes`) can
stop the search early, and a node-limited solve returns an incumbent with no
proven bound attached, so it can and does return a non-optimal plan. The measured
invariant violations are exactly that case. What holds unconditionally is the
other half: the plan is *judged* before it is returned — scored by a
re-derivation of the exact objective, so the linearisation steers and the real
objective decides.

**What it costs.** About a second on a production-scale instance, against ~110ms
for the search it replaced.

One avoidable part of that has been removed. The craft columns used to be the
only columns in the model with no bound of their own — the conservation rows
bound them, but only through a chain presolve has to walk tier by tier — so
`model.ts` now derives a per-column bound from the recipe directly
(`craftUpperBounds`, and `solver/SPEC.md` section 2 for why it is a relaxation).
Measured at 26% of a two-target production solve, for an identical plan. The
gap was found by accident, from a *slack* golden egg budget row speeding the
solver up by a similar margin. Almost all of that is branch-and-bound, not the
WebAssembly boundary, so it does not come back with a faster interface. The
budget that bounds it (`maxNodes`) is deliberately a node count rather than a
wall clock, because the same inputs have to produce the same plan;
`DEFAULT_TUNING` in `solver/oa.ts` records the measured curve and why the default
sits where it does.

**What it buys.** Measured over the arena's 40 instances: no plan that collapses
to probability zero, against eight for the previous search, and a worst
monotonicity violation of 0.20 nats against 1.09. See `solver/RESULTS.md`.

**What is still wrong with it.** Roughly sixty invariant violations across the
sweep, all of the form "a more constrained problem scored better", all small, and
all attributable to the node budget rather than to the model — raising it to 5000
removes seven-eighths of them at seven times the wall clock. There is also a
latent issue the sweep does not isolate: the per-target scale `theta_t` is an LP
maximum computed *subject to the budgets*, and the tangent grid is placed in
units of theta, so changing a budget re-approximates the objective rather than
merely enlarging the feasible set. A1/A2 are not theorems even at proven
optimality until that is fixed.

## The worker boundary

The planner runs off the main thread (`optimizer.worker.ts`). Every solve is
around a second, and the first one in a worker's life also fetches and
instantiates a 3.4MB WebAssembly module; on the main thread that would block
paint outright.

**Launch-option enumeration stays on the main thread.** It is the only step that
needs the ~18MB loot dataset, and the main bundle already loads that dataset for
the mission views — enumerating in the worker would put a second copy in the
worker bundle. For the same reason `optimizer.worker.ts` imports `optimizeFull`
directly rather than through the `lib` barrel, which re-exports the loot data.

The traffic goes the other way too: `index.ts`'s `optimize()` imports
`optimizer-core` *dynamically*, because the barrel is what the components import
and a static import would drag the solver and its Emscripten glue into the main
chunk, where nothing needs them.

`optimizer-worker-protocol.ts` exists because structured clone preserves Maps
and plain objects but **drops prototypes**. Every payload is plain data except
`ship`, a `MissionType` whose entire API is getters over two numeric fields; a
cloned copy would arrive with the fields intact and every getter gone, failing
far away from the boundary in whatever template reads `ship.shipName`. So the
ship is explicitly narrowed to its two fields on the way out and reconstructed
on the way in.

`optimizer-client.ts` reuses one worker across runs, replacing it only if it
dies, and numbers requests so that only the newest one's result is delivered —
with auto-compute on, a burst of input changes queues several solves and every
result but the last describes settings the user has already moved past. A
superseded (or torn-down) request resolves with `null`, which callers read as
"no result is coming, leave state alone".

The request also carries the planner's two search budgets, so the worker never
has to know where a setting came from. They are node- and round-based rather than
a wall clock on purpose: the same request has to produce the same plan however
loaded the machine is, which a time limit cannot promise.

Presentation-only fields (`expectedDrops`, `fuelByEgg`, sorted `choiceHistory`)
are filled in by `finalizeSolutions` on the main thread, so the worker path and
`optimize()` produce identical solutions.

## Previous crafts

A target's `legendaryCraftProbability` depends on how many times the player has
already crafted it. With a save loaded, each target uses **its own** crafted
count from the inventory. A manual override applies to **every** target.
`buildRecipeDag` implements this by treating an undefined `previousCraftsOverride`
as "read per-target".

## Owned inventory

`computeBaseYield` counts the player's stock across all rarities, because any
rarity can be fed to a recipe. This is "how many copies you can feed a recipe",
never "you already own a legendary" — the legendary side of the objective comes
solely from mission drops.

A target is skipped only when nothing in the DAG consumes it. Such a node has no
conservation row in the inner LP, so owned copies could never be spent and would
only look like free progress. A target that *is* an ingredient of another target
— which covers 21 of the 22 selectable legendaries — keeps its stock, which can
only relax the consumption side of its row.

## Per-target display attribution

For a multi-target solution the LP crafts a shared component once and splits it
across the targets that consume it, so `craftPrimal` / `finalYieldVector` are
solution-wide pooled totals. `computeCraftChainTree` attributes each node's
pooled crafted/dropped/consumed/owned to a target in proportion to that target's
share of total recursive demand for the node, so the per-target breakdowns sum
back to the pooled totals instead of showing each artifact "using" the whole
pool. The root target itself is never scaled: every craft of it rolls for its
own legendary. With a single target every share is 1.

## Golden egg cost

The plan is priced by `optimizer-cost.ts`, which reads a finished solution. The
price curve is not re-derived here — `singleCraftCost`/`multiCraftCost` come from
`lib`, so the numbers shown are the game's own, seeded with the player's
`crafted` count per item (a veteran pays less for the same plan).

### The cap

Pricing is unconditional; *constraining* is opt-in. With the sidebar's maximum
crafting cost on, the request carries a `CraftBudget` and the plan is capped as
well as priced.

**One linear row, in three models.** The cap is
`sum_n price_n * crafts_n <= capacity`, and it has to be written everywhere the
craft counts are decided or the cap does not bind on the number the card prints.
The MILP (`solver/SPEC.md`, row `goldenEggs`) is where it changes which
ingredients get gathered, but the reported `craftPrimal` is re-derived downstream
by `compileJointInnerLp` and then `refineJointCraftSplit`, so both carry the same
row. Frank-Wolfe only ever moves between the current point and a vertex of that
same polytope, and the row is linear, so every iterate stays inside the budget.

**Why the row is linear when the cost is not.** The curve decreases in the craft
index, so the true cost is concave in the craft count and
`sum_n cost_n(crafts_n) <= capacity` is not a convex constraint. `price_n` is
therefore the player's *next* craft of `n` — the dearest craft the plan can make
of it, which is the tangent of the true cost at zero. The row over-states the
bill and never under-states it, so **a plan that satisfies it is always
affordable**, which is the direction a hard cap has to err in. It is paid for in
the other direction: a plan taking many crafts of one node is charged as though
every one of them cost the first one's price, so some affordable plans are
rejected. The gap is the node's `base`/`low` price ratio at worst, and a tighter
treatment means relinearizing at the incumbent across rounds rather than pricing
once.

**The card reports that same linear price.** `fractionalCraftCost` prices every
craft at the player's next one too, so the bill on the card is the bill the plan
was selected under. Reporting the true curve instead reads as a bug in the cap: a
player who sets a maximum craft cost and is shown a plan priced well below it
sees a cap that did not bind where it said it did. The cost of the consistency is
that the reported figure over-states what the game will actually charge, by the
same `base`/`low` ratio the row gives up above — the two now err together instead
of disagreeing.

The demarcation on the solution card is a separate question from the cap and does
not require it: with a save loaded, the card compares the plan's bill against
`goldenEggsEarned - goldenEggsSpent` and marks the cost line when the plan costs
more than the player has. It reads the same over-stating price, so it marks a
little early rather than a little late.

`craftPrimal` is an LP relaxation, so craft counts are fractional while lib's
curve is indexed by an integer craft number. Pricing linearly sidesteps that
entirely: `fractionalCraftCost` is proportional in the craft count, with no
integer index to round a fraction to.

Two numbers, one bill. The solution card's total comes from
`computePlanCraftingCost`, which prices the **unsplit** `craftPrimal` — one bill
for the whole plan. The per-node `goldenEggCost` in a craft-chain tree prices that
same pooled quantity and then takes the target's demand-weighted share of the
result (see above), exactly as every other metric on the node is `pooled * share`.
Under a linear price the two orders agree — pricing the *scaled* count would
reach the same total, since the shares sum to one — so the split decides which
target carries a shared node's bill, not how large the bill is. The per-target
chain subtotals reconcile with the card's total either way. (Against lib's real
decreasing curve they would not: scaling first restarts the curve per target and
overstates. That is worth knowing if the report is ever moved back onto the true
curve, which would make the pooled ordering load-bearing again.)

One caveat to that reconciliation, and it predates pricing: a tree's root is never
scaled (`shareOf` returns 1 for it). If one target's artifact is also an ingredient
of another target, it is billed in full to its own chain and again as a share of
the other's, so those subtotals sum to more than the plan total. The card's total
remains the figure to trust.

The manual "previous crafts" override feeds `legendaryCraftProbability` only.
Pricing always reads the real crafted counts from the save.

## File map

| File | Role |
| --- | --- |
| `optimizer-core.ts` | The pipeline around the planner: `buildEvalContext` compiles the objective, `optimizeFull` states the problem and calls the MILP, `assembleFullSolution` turns an allocation into a renderable solution. |
| `solver/` | The planner itself — the MILP, the outer approximation, the HiGHS binding. `../oracle/arena/solvers/highs/index.ts` is a shim that registers this same module as the arena's entry, so the shipped solver and the measured one are one code path. See its `SPEC.md`. |
| `packing.ts` | Exact 3-bin feasibility returning a witness assignment. Standalone by design: it imports nothing, and in particular nothing from `../oracle/`, because the oracle spec re-checks every solver plan against its own independent feasibility routine. Sharing one implementation would make that assertion circular. |
| `value-function.ts` | Inner crafting LP, the tangent epigraph construction, `alphaToProb`, and `refineJointCraftSplit`. |
| `lp.ts` | Small dense-tableau simplex with Bland's rule, tuned for many small re-solves. Equilibrates rows and columns before solving: an absolute epsilon against raw fuel coefficients (~1e18) and craft-conservation rows (~1) in the same tableau used to stop the pivot loop early while reporting `'optimal'`. |
| `phases.ts` | Recipe DAG construction and launch-option enumeration from loot data. |
| `index.ts` | Pipeline glue: `buildRecipeDag`, `computeBaseYield`, `finalizeSolutions`, and an async `optimize` used only by tests — it imports `optimizer-core` dynamically so the solver stays out of the main chunk. |
| `optimizer.worker.ts` | Worker entry point; awaits `optimizeFull`. The only place the *app* awaits the solve — `index.ts` has the other await site, on the test-only path. Everything below the seam is synchronous, which is also why the worker drops requests a newer one has superseded. |
| `optimizer-worker-protocol.ts` | Wire types and `MissionType` narrow/reconstruct across structured clone. |
| `optimizer-client.ts` | Main-thread worker lifecycle, request numbering, supersession. |
| `optimizer-tree.ts` | Recipe-tree builders for the inventory and craft-chain panels. |
| `optimizer-views.ts` | Flat presentation helpers derived from a solution. |
| `optimizer-cost.ts` | Golden egg pricing of a plan's craft chain, over `lib`'s price curve, and the linear per-craft prices the cap's row is built from. |
| `types.ts` | Shared types for all of the above. |
| `../oracle/` | Brute-force correctness harness; see its own README. |
| `../components/ArtifactMissionOptimizer.vue` | Top-level planner: assembles inputs, drives the worker, debounces auto-compute. |
| `../components/optimizer/` | Sidebar, solution card, probability breakdown, tree rows. |

## The oracle

`src/oracle/` is an independent correctness harness that treats `optimizeFull`
as a black box: nothing in it imports the solver's internals, the three-slot
packing check is re-derived, and the objective is re-derived from this document
rather than from `value-function.ts`. It checks feasibility, honesty (the
reported probability matches an independent re-evaluation) and optimality
(no enumerated feasible allocation beats the plan by more than the tolerance).

Its joint evaluator solves the true objective directly — no LP relaxation, no
tangent lines — via **away-step Frank-Wolfe** over the craft polytope, so it can
catch bugs in the tangent approximation instead of repeating its logic. Away
steps rather than plain Frank-Wolfe because plain FW converges at `O(1/k)` and
zig-zags badly when the optimum lies in the interior of a polytope face, which
happens whenever one target is another's ingredient; retreating from the worst
active vertex restores effectively linear convergence. The iteration is seeded
at the centroid of the per-target max-craft vertices rather than an LP vertex,
because a vertex seed leaves `n-1` targets at zero crafts where `g(0) = -Infinity`
pins the line search.

See `src/oracle/README.md` for how to run it and what the tunables mean.

## Known accuracy limits

The following is long-standing and asserted by tests, not a bug awaiting a fix.

- **Tangent envelope slack.** The 26-point geometric grid spends 18 of its
  points below `s = 0.16`, so log-space error near zero is small (~2.2e-2 at
  `s = 0.001`, against ~2.93 on the 22-point grid it replaced). It pays for that
  through the mid-range: the worst probability-space over-estimate is ~2.5e-2
  around `s = 1.3`, and ~2.2e-2 at `s = 2.2` where the old grid was ~6.8e-4.
  **This is looser than the deltas the oracle campaign chases** (max 4.6e-4), so
  where the envelope misranks two plans no amount of search or packing work can
  recover the difference. Below the first breakpoint (`s < 1e-5`) log error
  grows without bound, which is why the final split is refined off-grid; it
  stays under 1e-5 in probability space there.
Seed 1019 (`cheap-filler`, single target) used to be listed here as a permanent
limitation. It is now solved exactly; the exact packer was what it needed.

## Campaign results

The numbers below are **historical**: they measure the LP-relaxation and beam
search that `optimizeFull` used before it became a MILP, and they are kept
because they are why it stopped being one.

Over 1022 oracle instances (seeds 1000-1179, all six families), counting a miss
as a relative probability shortfall above 0.5%:

| | misses | rate | max delta-abs |
| --- | --- | --- | --- |
| before that work | 69 | 6.8% | 9.5e-4 |
| after the exact packer + polish | 24 | 2.3% | 4.6e-4 |
| after the certificate/cap split | **16** | **1.6%** | **4.6e-4** |

The residue was diagnosed as needing "candidate generation that builds mixed
slot profiles directly rather than reaching them by local moves from a
uniform-slot start". That is exactly what a per-slot integer program does by
construction, and it is the argument that eventually replaced the search
outright.

An ablation over a 272-instance stratified subset produced two findings worth
keeping now that the stages themselves are gone. The beam polish was the single
highest-value stage — removing it doubled the miss count for ~24ms — which is a
statement about how much of that method's quality came from *repairing* a plan
chosen without the packing constraint. And the dominance filter was starving the
pair and triple scans of the options they needed: with the filter on, deleting
the scans cost nothing; with it off, they were worth 8 misses. Both are
symptoms of a pipeline whose stages each saw a different relaxation of the same
problem.

The current planner's accuracy is measured by the arena instead, on invariants
rather than against a brute-force optimum, because the invariants scale to
instance sizes the oracle cannot enumerate. See `ARENA.md`.

## Tests are local-only

Nothing in `.github/workflows/` runs the test suite — CI only builds. Every spec
in `src/lib/` and `src/oracle/`, including the latency caps in
`optimizer-perf.spec.ts`, is a local development tool. Run them yourself:

```sh
pnpm exec vitest run src/    # unit + smoke oracle
pnpm test:oracle             # + deep oracle campaign
RUN_PERF=1 pnpm exec vitest run src/lib/optimizer-perf.spec.ts
```

A perf cap failing on your machine means your machine, not necessarily a
regression; the caps are calibrated against a reference machine and documented
in that spec.
