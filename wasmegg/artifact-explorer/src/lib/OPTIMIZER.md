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

Everything the search does — dominance pruning, the LP relaxation, the ternary
scans, greedy repair — needs only that `F` is concave and non-decreasing in
inventory. Each `score_T` is concave and non-decreasing, `g` is concave and
non-decreasing, a non-decreasing concave function of such an argument stays
concave and non-decreasing, and a sum of those keeps both properties. None of
that machinery cares how many terms it is climbing.

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

`optimizeFull` solves twice and repairs:

- a **relaxed** solve over `3S` aggregate time, giving an upper bound `U` plus a
  candidate allocation that may not be three-bin packable;
- a **floor** solve over `R/3` fuel and `S` time, tripled — three identical
  single-slot plans, always packable.

Both are then run through `packAndFill`, alongside a greedy build from empty
slots. If the best packable plan still trails `U` by more than epsilon,
`escalatePacking` seeds one slot full of each LP-support option and re-fills,
exploring per-slot specializations the balanced relaxation misses.

`packAndFill` caps fuel first (dropping by worst score-loss-per-fuel-freed),
then asks `packing.ts`'s exact packer for a witness assignment and keeps every
mission when one exists. Only a provably unpackable multiset is shrunk, one
mission at a time, choosing the removal that costs the least score.
Best-fit-decreasing survives as a fallback for when the packer cannot decide
inside its node budget. This ordering matters: BFD packed longest-first and
dropped whatever spilled, which shrank allocations that were already packable
and, when one genuinely did not pack, chose what to shed by duration rather
than by value.

Finally `polish` runs on the winning candidate *and* on the escalation result:
a local search in packable space over `+1`, `-1`, and the exchange `-1 i /
+1 j`, accepting a move only when it stays inside the fuel budget, passes the
exact packer, and improves the score. Everything upstream searches aggregate
`3S` time and then projects into three bins, so it can only add or drop — an
exchange is unreachable from there even when it is the optimum. It is a
width-4 beam rather than a hill climb because a pure climb measurably cannot
reach these optima: incumbents exist with no improving packable neighbour at
all whose optimum is two moves out, across a downhill step, on a branch that is
not the best-scoring one.

`coreSearch` is the single-time-budget integer search inside each of those:

1. **Dominance pruning.** `j` dominates `i` when it costs no more on either
   budget and yields at least as much of everything, strictly better somewhere.
   Yields are compared pointwise rather than by solo score, so complementary
   options survive — the only good source of some ingredient must not be pruned
   for having a poor standalone score. "Everything" includes each target's
   direct legendary drops compared *per target*, never pooled: an option
   dropping more of target A's legendary and less of target B's dominates
   neither. Only search targets are compared, since they are the only nodes
   whose legendary rate reaches the objective.
2. **Single-option sweep**, which also records each option's solo score for the
   triple scan's ranking.
3. **LP relaxation** (`solveRelaxationLp`), giving the upper bound `U` and the
   support set. It carries the same tangent rows as the inner LP, except that
   here `lambda_T` is itself a linear combination of the option-count variables
   rather than a precomputed constant, which is why it is built directly instead
   of reusing the inner LP's fixed matrix.
4. **Epsilon certificate.** For a non-support option with reduced cost
   `rc <= 0`, `lp.F + rc` upper-bounds any solution forced to include it (LP
   sensitivity, plus IP <= LP). It is pruned only when that bound cannot beat
   the *incumbent* by more than epsilon. Measuring against the LP optimum
   instead — as this once did — is unsound whenever the integrality gap exceeds
   epsilon, which is the regime these instances live in. Skipped entirely when
   the relaxation is not certified optimal.
5. **Scan budget cap.** The survivors are ranked by `lp.F + rc` and only the top
   `SCAN_MAX_SURVIVORS` feed the scans, with `SCAN_MAX_TRIPLE` bounding the
   triple pool separately because one triple costs ~40x a pair on top of
   growing as n^3. This is a **compute heuristic and nothing more** — the
   options it excludes are *not* claimed epsilon-irrelevant. They stay reachable
   through `repairAlloc`'s full-list scan and through `polish`'s candidate set,
   which is exactly why capping is safe where pruning was not.
6. **Pair scans** over the capped survivors, then **triple scans** if the gap is
   still wide. The triple pool ranks LP support first (complementary options
   with poor standalone scores live there), then the top-K by solo score.
7. **Greedy repair** from the best allocation and again from the floor-rounded
   LP solution, keeping whichever start ends up better.

Both scans are nested integer ternary searches. **The concavity this relies on
does not actually hold** — the pair lattices are sawtooth, with 25 turning
points measured on one instance's `(0,2)` lattice. Replacing every
`ternaryMaxOver` with an exhaustive scan was tried and changed no outcome on
any miss examined, so this is a known unsound shortcut that has not yet cost
anything, not a proven-safe one.

## The worker boundary

The search runs off the main thread (`optimizer.worker.ts`). A single-target
plan solves in well under 100ms, but a multi-target joint search runs in
seconds; on the main thread that would block paint.

**Launch-option enumeration stays on the main thread.** It is the only step that
needs the ~18MB loot dataset, and the main bundle already loads that dataset for
the mission views — enumerating in the worker would put a second copy in the
worker bundle. For the same reason `optimizer.worker.ts` imports `optimizeFull`
directly rather than through the `lib` barrel, which re-exports the loot data.

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

Presentation-only fields (`expectedDrops`, `fuelByEgg`, sorted `choiceHistory`)
are filled in by `finalizeSolutions` on the main thread, so the worker path and
the synchronous `optimize()` produce identical solutions.

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

## File map

| File | Role |
| --- | --- |
| `optimizer-core.ts` | The outer search: pruning, LP relaxation, pair/triple scans, packing, polish, repair. `optimizeFull` is the entry point. |
| `packing.ts` | Exact 3-bin feasibility returning a witness assignment. Standalone by design: it imports nothing, and in particular nothing from `../oracle/`, because the oracle spec re-checks every solver plan against its own independent feasibility routine. Sharing one implementation would make that assertion circular. |
| `value-function.ts` | Inner crafting LP, the tangent epigraph construction, `alphaToProb`, and `refineJointCraftSplit`. |
| `lp.ts` | Small dense-tableau simplex with Bland's rule, tuned for many small re-solves. Equilibrates rows and columns before solving: an absolute epsilon against raw fuel coefficients (~1e18) and craft-conservation rows (~1) in the same tableau used to stop the pivot loop early while reporting `'optimal'`. |
| `phases.ts` | Recipe DAG construction and launch-option enumeration from loot data. |
| `index.ts` | Pipeline glue: `buildRecipeDag`, `computeBaseYield`, `finalizeSolutions`, synchronous `optimize`. |
| `optimizer.worker.ts` | Worker entry point; runs `optimizeFull` only. |
| `optimizer-worker-protocol.ts` | Wire types and `MissionType` narrow/reconstruct across structured clone. |
| `optimizer-client.ts` | Main-thread worker lifecycle, request numbering, supersession. |
| `optimizer-tree.ts` | Recipe-tree builders for the inventory and craft-chain panels. |
| `optimizer-views.ts` | Flat presentation helpers derived from a solution. |
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

Over 1022 oracle instances (seeds 1000-1179, all six families), counting a miss
as a relative probability shortfall above 0.5%:

| | misses | rate | max delta-abs |
| --- | --- | --- | --- |
| before this work | 69 | 6.8% | 9.5e-4 |
| after the exact packer + polish | 24 | 2.3% | 4.6e-4 |
| after the certificate/cap split | **16** | **1.6%** | **4.6e-4** |

54 instances fixed, 15 of the originals still missing, and one new miss
(`random-multi:1053`, delta-abs 1.5e-6). Of the 16 remaining, 12 have
delta-abs below 3e-6 — several are large *relative* gaps on probabilities near
1e-10, where relative error is not meaningful. Only `chunky-knapsack:1006`
(4.6e-4) is materially wrong.

The residue needs candidate generation that builds mixed slot profiles directly
rather than reaching them by local moves from a uniform-slot start, and it is
bounded below by the tangent envelope's mid-range slack (~2.5e-2, far wider
than these gaps) — no amount of search work can resolve a plan the scoring
function itself ranks wrongly.

## Which stages actually earn their keep

Measured by ablation over a 272-instance stratified subset (every known miss
plus a 200-instance random control), each config removing exactly one stage
with everything else held fixed. Latency is best-of-9 on `tachyon-deflector-4`,
measured serially. Do not re-derive this from win-share statistics: win share
conflates redundancy with worthlessness, since a stage can be redundant on most
instances and still be the only thing that solves the hard ones.

| Config | misses | latency |
| --- | --- | --- |
| all stages on | 24 | 134ms |
| − triple scan | 23 | 133ms |
| − triple − pairwise | 23 | 132ms |
| − dual filter | **15** | **23,283ms** |
| − scans − dual filter | 23 | 133ms |
| − LP support seeds in escalation | 26 | 118ms |
| − `U` as escalation trigger | 24 | 136ms |
| − polish | **49** | 110ms |

Three conclusions worth keeping:

- **Polish is the highest-value stage.** Removing it doubles the miss count and
  worsens max delta-abs, for ~24ms.
- **The scans are not dead weight, despite rows 2 and 3.** Read rows 4 and 5
  together: with the filter pruning, deleting the scans costs nothing; with it
  off, the scans are worth 8 misses. They were being starved of the options they
  needed. Deleting them on the strength of rows 2-3 alone would have
  permanently forfeited that recovery path.
- **The LP is worth keeping as a seed generator** (row 6) even though `U` as a
  bound earns nothing measurable (row 7). Those are separate questions about the
  same LP and want separate answers.

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
