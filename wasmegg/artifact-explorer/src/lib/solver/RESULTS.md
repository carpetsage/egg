# Measured: the MILP planner in the arena

What this solver scores against `src/oracle/arena/`. `SPEC.md` describes the
method; this file is only numbers and what they say.

Everything below was measured on the arena's default cheap sweep
(`ARENA=sweep pnpm arena`, 40 instances, seeds 2000-2039) on the development
container, at the shipped tuning of `{maxRounds: 2, maxNodes: 5}`, unless a row
says otherwise. `results/highs.json` is gitignored and every sweep rewrites it,
so these are transcriptions, not a committed reference.

## The scorecard

Two full sweeps. The second was run after the `SAFE_LARGE_COEFFICIENT` cap in
`milp.ts` and reproduces the first to the unit — same violation count, same clean
count, same per-invariant counts, same worst magnitudes — which is what says that
cap only touches rows that would otherwise have made the model unreadable.

| | run 1 | run 2 |
| --- | --- | --- |
| violations | 63 | 63 |
| clean instances | 23/40 | 23/40 |
| invariants firing | 5 | 5 |
| `p -> 0` / `0 -> p` collapses | **0** | **0** |
| worst finite violation | 0.1951 nats | 0.1951 nats |
| solve latency median / p90 / max | 1090 / 2738 / 3727 ms | 1093 / 2756 / 3745 ms |
| sweep wall clock | 2228 s | 2223 s |
| mean log10(joint) | -6.775 | -6.775 |

| invariant | count | instances | worst finite |
| --- | --- | --- | --- |
| A3-menu | 39 | 13 | 0.1951 nats |
| B2-target-order | 11 | 11 | 0.1620 nats |
| A5-effort | 8 | 7 | -0.0366 nats |
| A1-fuel | 4 | 4 | -0.0148 nats |
| A2-time | 1 | 1 | -0.0595 nats |

Five invariants fire; the rest are held outright. Violations concentrate rather
than spread: 17 instances carry all 63, and `arena:2038` alone carries 10.

**Every violation is a truncated search, not a modelling gap.** They all have the
form "a more constrained problem scored better", they are all under 0.2 nats, and
none is a collapse to or from probability zero.

That the node budget is the cause is measurable directly: re-running the checks
at `maxNodes: 5000` over the 18 instances carrying every violation takes them
from **55 to 8**, and 0/18 clean to 12/18, with the worst magnitude going 0.0790
to 0.0065 nats. It is also why raising the cap is not the fix — it costs about
seven times the wall clock and provokes `HiGHS error -1` on two instances.

## What the budgets buy

Full sweeps with the invariant checks are the bottom three rows; the top two are
solve-only probes.

| rounds, nodes | median | p90 | max | violations | clean | worst A3 | mean log10(joint) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1, 0 | 46 ms | 82 ms | 130 ms | — | — | — | **p = 0 on 39/39** |
| 1, 50 | 658 ms | 1586 ms | 2487 ms | — | — | — | -6.7778 |
| **2, 5** | **1090 ms** | **2738 ms** | **3727 ms** | **63** | **23/40** | 0.1951 | **-6.775** |
| 2, 50 | 1208 ms | 2987 ms | 4064 ms | 62 | 24/40 | 0.2410 | -6.774 |
| 3, 200 | 2103 ms | 4814 ms | 5989 ms | 55 | 22/40 | 0.0790 | -6.771 |

**Branching is not optional.** `maxNodes: 0` returns probability zero on every
instance, even at `mip_heuristic_effort: 1.0` — the root heuristics never find an
incumbent — so the 46 ms floor is not a mode anyone can ship.

**`{2,5}` and `{2,50}` are near-identical solvers.** 36 of 40 plans come out
identical; the violation delta is eight instances moving in both directions for a
net of one; the extra nodes cost 11% of the wall clock. Between those two, take
the cheap one.

**Quality is flat across the whole table.** The three swept means sit inside
0.004 log10 of each other. Nothing here is a quality decision.

**What extra rounds buy is monotonicity.** Going from three rounds to two roughly
triples the worst-case violation magnitude (A3-menu 0.0790 -> 0.1951 nats) while
leaving the count and the quality broadly alone. The likely mechanism — a
hypothesis, not a finding — is that refinement cuts are placed where the previous
round landed, so a second round re-linearizes around a budget-dependent point and
amplifies path dependence, which a third round damps by converging.

The default is the cheap end of the two-round plateau, chosen for the instances
real players bring rather than for the arena's uniform-random tail.

## Where the time goes

Measured on the real MILP the loop builds for seed 2011 (953 columns, 684 of them
integer, 353 rows):

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

**Two sweeps, not three.** The two agree exactly. The `{2,50}` and `{3,200}` rows
are single sweeps, as are the per-solve probes.

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
