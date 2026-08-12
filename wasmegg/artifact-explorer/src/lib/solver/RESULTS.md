# Measured: the MILP planner in the arena

What this solver scores against `src/oracle/arena/`. `SPEC.md` describes the
method; this file is only numbers and what they say.

Everything below was measured on the arena's default cheap sweep
(`ARENA=sweep pnpm arena`, 40 instances, seeds 2000-2039) on the development
container, at the shipped tuning — one MILP at `maxNodes: 200` over a 100-point
tangent grid — unless a row says otherwise. `results/highs.json` is gitignored
and every sweep rewrites it, so these are transcriptions, not a committed
reference.

**Counts from different eras of this file do not compare.** The invariant set has
grown since the first scorecard was written here (A4-inventory and A9-golden-eggs
did not exist then, B2-target-order has since been fixed outright) and the
judge's packing budget has moved, so a violation count means something only
against another count from the same harness on the same seeds. Older figures
below are labelled with the tuning and era they came from.

## The scorecard

| | |
| --- | --- |
| violations | 76 |
| clean instances | 17/40 |
| invariants firing | 6 |
| `p -> 0` / `0 -> p` collapses | **0** |
| worst finite violation | -0.1446 nats |
| solve latency median / p90 / max | 917 / 1730 / 1911 ms |
| sweep wall clock | 2064 s |
| mean log10(joint) | -6.771 |

| invariant | count | instances | worst finite |
| --- | --- | --- | --- |
| A3-menu | 43 | 17 | 0.0514 nats |
| A9-golden-eggs | 10 | 10 | -0.0170 nats |
| A5-effort | 8 | 8 | -0.1446 nats |
| A4-inventory | 5 | 5 | -0.0504 nats |
| A1-fuel | 5 | 5 | -0.0488 nats |
| A2-time | 5 | 3 | -0.0951 nats |

Measured twice on the same instances, on either side of the edit that made this
the default: once as a registered arena candidate against the then-shipped
planner (76 violations, 17/40 clean, median 919 / p90 1733 / max 1925 ms, mean
log10 -6.771), and again after the refinement loop came out of `oa.ts`. Every
count reproduces to the unit and the latencies agree inside 1%, which is the
check that the deletion was a deletion: the same plans, from less code.

**Every violation is a truncated search, not a modelling gap.** They all have the
form "a more constrained problem scored better", they are all under 0.15 nats,
and none is a collapse to or from probability zero. A3-menu dominates and always
has: hiding a ship the plan was not going to use changes the search's path
through the tree without changing the set of plans available to it.

That the node budget is the cause is measurable directly, though the probe below
predates this tuning: at the retired `{2 rounds, 5 nodes}` default, re-running
the checks at `maxNodes: 5000` over the 18 instances carrying every violation
took them from **55 to 8**, and 0/18 clean to 12/18, with the worst magnitude
going 0.0790 to 0.0065 nats. It is also why raising the cap is not the fix — it
cost about seven times the wall clock and provoked `HiGHS error -1` on two
instances.

## What the budgets buy

Three 40-instance campaigns, seed bases 2000 / 9000 / 5000, every arm run over
the identical instances in the same invocation. Summed over the three, as
violation count / summed severity in nats:

| tuning | count | severity | |
| --- | --- | --- | --- |
| {2 rounds, 5 nodes, 15-point grid} | 222 | 2.680 | the retired default |
| {2 rounds, 5 nodes, 50-point grid} | 208 | 1.578 | best severity, and not what ships |
| {1 round, 5 nodes, 100-point grid} | 245 | 2.611 | |
| {1 round, 50 nodes, 100-point grid} | 240 | 2.357 | |
| {1 round, 100 nodes, 100-point grid} | 234 | 2.314 | |
| **{1 round, 200 nodes, 100-point grid}** | **220** | **1.820** | **ships** |

**Three campaigns, because one cannot read this.** The retired default's own
severity swings 3x across seed bases (1.431 / 0.767 / 0.482) while the harness
itself is exactly reproducible — a re-run of seed base 2000 returned 79 / 1.431
against 79 / 1.431. Any single-campaign delta under about 1.5x is noise, which is
how the 100-node arm briefly looked like a winner: on seed base 2000 alone it
beat the default on every axis and none of it replicated.

**A single pass is only worth it at 200 nodes.** Below that it loses to two
rounds on violation count in 3 campaigns of 3. At 200 it wins on severity 3/3, on
quality 3/3 (+0.0022, +0.0010, +0.0011 mean log10 joint; head-to-head 17/7, 16/8,
14/9) and on wall clock 3/3 (-3.8%, -11.9%, -8.9%), with the worst single solve
down about a third: 1925 / 2230 / 2013 ms against 2633 / 2678 / 2958 ms.

**The 50-point two-round arm is the one that got away, and it stays away.** It
wins severity outright, 1.70x against this tuning's 1.47x. It also costs 7-11%
more wall clock, keeps a second MILP, and has a 3947 ms worst case against 1925 —
so it buys monotonicity with the number a user actually feels. The shipped
tuning is the only arm that improved correctness *and* latency.

**What the second round was doing was not envelope repair.** A placebo round
solved against a row-permutation of the identical cut set — same polytope, same
optimum, zero new information — changed the answer on 17 of 39 instances and kept
42% of real refinement's gain, with a larger worst-case swing than refinement
produces. A decoy round placing cuts at sigma ~ 1e-4, where nothing ever goes,
changed 26 of 39 and kept 47%. Ordered by gain: refinement 0.1724 > random
shuffle 0.1360 > row reversal 0.0728 nats. So the round was a search restart with
a slightly loaded die, and 200 nodes in one pass buys more than the restart did.

**The variance it was cashing is small and nearly exhausted.** Eight cut-row
shuffles of a single round: 18 of 39 instances return byte-identical plans,
median spread 0.0006 nats, and best-of-K saturates at 0.2200 nats with K=2
already at 0.1360. Depth does not substitute — at 50,000 nodes only 20 of 40
instances are proven optimal, growing about 4.5 instances per decade.

**Branching is not optional.** `maxNodes: 0` returns probability zero on every
instance, even at `mip_heuristic_effort: 1.0` — the root heuristics never find an
incumbent — so the 46 ms floor that buys is not a mode anyone can ship.

**Quality is flat across every tuning ever swept.** The means sit inside 0.005
log10 of each other. Nothing in this table is a quality decision; they are
monotonicity and latency decisions.

## Where the time goes

Measured on the real MILP built for seed 2011 (953 columns, 684 of them integer,
353 rows) under the retired 15-point grid. The 100-point grid adds rows and
nothing else — 85 more per target, no new columns and no new integers — so the
table's conclusion is unaffected by it, and the sweep getting *faster* on a
matrix with twice the rows is the same point from the other end:

| | wall clock | status |
| --- | --- | --- |
| the same matrix as a pure LP | 18 ms | optimal |
| MILP, root only (`mip_max_nodes=0`) | 39 ms | node limit |
| MILP, 30 nodes | 1410 ms | node limit |
| MILP, 200 nodes | 1794 ms | **optimal** |
| MILP, 5000 nodes | 1837 ms | optimal |
| MILP, integrality on `N[g]` only | 433 ms | optimal |

**The integer search is where the time goes** — 18 ms to 1794 ms on the same
matrix — even though the tree stops changing the answer past ~30 nodes. Inert is
not absent: the nodes are bought and paid for. `mip_heuristic_effort: 0` recovers
nothing (1799 ms against 1802 ms), so this is branching, not HiGHS's primal
heuristics.

**The three-fold slot symmetry is the largest single driver.** Moving integrality
from the 684 per-slot columns onto the 228 aggregate `N[g]` columns takes the same
instance from 1794 ms to 433 ms. That 4x is not available: aggregate integrality
is precisely the model that cannot see the packing, and stating the packing is
what the collapse-free scorecard above is bought with. `order_k` breaks the
symmetry on aggregate slot *load*, not on which group lands in which slot, and
that residue is what the tree pays for.

**The LP text is not the cost.** Building the LP text in JS is 0.1-1.2 ms even on
the widest instance; ingestion plus solution round trip is 12-35 ms per call,
which is 75-85% of a *continuous* solve (a scale LP is 7-17 ms, of which only
1-5 ms is simplex) but under 5% of an expensive MILP one — around a twentieth of
a typical plan.

## Caveats

**Three campaigns for the tuning decision, two sweeps for the scorecard.** The
budget table is summed over three seed bases because one cannot resolve a delta
this size; the scorecard is seed base 2000 twice, before and after the shipped
edit, and they agree to the unit. The per-solve probes and the older
`maxNodes: 5000` experiment are single runs.

**An earlier pair of sweeps, at the retired `{2, 5}` tuning, bracketed the
`SAFE_LARGE_COEFFICIENT` cap** in `milp.ts` and reproduced each other to the unit
across every count and magnitude — which is what says that cap only touches rows
that would otherwise have made the model unreadable. Those runs scored 63
violations and 23/40 clean, against a smaller invariant set; see the note at the
top about comparing eras.

**The comparison against the search this replaced is not reproducible.** On the
same 40 instances, `optimizer-core.ts`'s LP relaxation, dominance-pruned integer
search, packing and beam polish scored 59 violations, 11/40 clean, a worst finite
violation of **-1.0917 nats** and **eight `p -> 0` collapses**, at a median solve
of 77 ms. That is roughly fourteen times faster than this solver and wrong in the
way that matters most: a collapse means a plan that cannot craft the target at
all. Those figures come from sweeps run while both entries were registered, in
the same invocation and under the same load; the entry no longer exists, so they
cannot be re-measured. That solver was also never fully deterministic — it
time-boxed its polish phase with a 15 ms wall clock, and two identical sweeps of
it returned 55 and 54 violations. This one has no wall-clock term, which is why
its two runs agree to the unit.
