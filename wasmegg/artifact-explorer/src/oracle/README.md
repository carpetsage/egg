# Brute-force oracle for the artifact optimizer

Correctness assurance for the heuristic outer solver (`optimizeFull`). The
solver stacks heuristics — ternary search over batch counts, dominance
pruning, an aggressive dual filter with greedy repair — any of which can
silently return a suboptimal plan. This harness measures that, treating the
solver as a black box: nothing in this directory imports the solver's
internals, only the public entry point and types.

## Real game data

Instances are built from the production data pipeline, not synthetic
fixtures: real recipe DAGs (`buildRecipeDag` over every craftable artifact
that can actually come out legendary), real launch options
(`enumerateLaunchOptions` over `perfectShipsConfig` — actual ships,
durations, fuel costs, and loot-derived yield/legendary-drop vectors), and
real crafting-level legendary probabilities (levels 10/20/30). The generator
only chooses which real target(s) to pursue, which subset of real missions
is on the table, the budgets (expressed as multiples of the subset's own
real costs, so brute force stays exhaustive), and the owned inventory.
Because instances derive from live loot data, refreshing that data shifts
what each seed generates; findings should be reproduced against the same
loot snapshot they were found on.

## How it works

For each generated instance the harness:

1. runs `optimizeFull` and maps its `choiceHistory` back onto the input
   options by their (fuel, time, target) triple (the ships-per-batch scale
   is measured at runtime by a probe whose optimal batch count is provable
   from the reported probability alone);
2. **feasibility** — recomputes fuel/time usage and checks it against the
   budgets and against the reported totals;
3. **honesty** — re-evaluates the returned plan with an evaluator built from
   disparate logic (an exact BigInt-rational simplex over the recipe DAG,
   derived only from the documented objective) and checks the reported
   probability against it;
4. **optimality** — exhaustively enumerates every maximal feasible integer
   allocation (exact, because the objective is monotone in inventory),
   evaluates each with the independent evaluator, and requires the solver's
   plan to be within `ORACLE_GAP_TOL` of the best;
5. **second opinion** — any optimality gap is re-priced through the solver's
   *own* value function (the oracle's winning allocation is fed back through
   `optimizeFull` as a single take-it-or-leave-it synthetic option), so a
   reported gap cannot be an artifact of the oracle's independent model.

Calibration probes with closed-form answers run first; if those fail, either
the solver is broken on trivial input or the oracle's reading of the contract
has drifted, and the fuzz results are void.

## Instance families

Seeded and fully reproducible selection/budget strategies over the real
mission pool: `random-single`, `random-multi` (two real targets competing
for shared ingredients), `cheap-filler` (an expensive real mission plus a
cheap one, with a budget remainder only the cheap one can use — the case the
dual filter knowingly discards), `near-tie` (the two real missions with the
closest fuel costs), `chunky-knapsack` (only expensive missions under a
tight budget), `edge` (zero/degenerate budgets, missions with observed
direct legendary drops, time-bound plans).

## Running it

```sh
pnpm test          # calibration + smoke tier only (~seconds)
pnpm test:oracle   # + deep campaign, 25 minutes by default
```

Knobs (environment variables):

| Variable | Default | Meaning |
| --- | --- | --- |
| `ORACLE_TIME_BUDGET_MS` | 25 min | wall-clock budget of the deep campaign |
| `ORACLE_GAP_TOL` | `1e-3` | max tolerated optimality gap, in absolute probability |
| `ORACLE_HONESTY_TOL` | `1e-6` | tolerated reporting discrepancy |
| `ORACLE_SEED_BASE` | `1000` | first seed; change to explore fresh instances |

The always-on smoke tier asserts only a catastrophic-gap guard (0.05) so the
default suite doesn't flake on known heuristic-scale gaps; the deep campaign
asserts the strict tolerance. Every failure line carries the family and
seed, so any finding can be reproduced exactly.

## Baseline (2026-07-19, hardened real-data harness, ~220k instances)

Honesty and calibration pass everywhere. With instances that pose genuine
allocation decisions (basket-priced budgets, banded subsets, decision-free
instances rejected), the campaign over seeds 1000-14276, 100000-113156, and
200000-213282 found:

- **Optimality**: 7.8% of instances have a nonzero gap; **1.8% exceed the
  1e-3 tolerance** (mean gap 8.3e-5, worst 0.11). `random-multi` is the
  worst family (~2.7% above tolerance), then `chunky-knapsack` and
  `random-single` (~1.8%), `cheap-filler` (~1.4%), `near-tie` (~0.3%).
- **Feasibility**: repeated instances (roughly 1 in 70k) where the returned
  plan overshoots the fuel and/or time budget — from a 4.5% time overrun
  (near-tie seed 1545) to 3-4x blowups on both axes (random-single seed
  1234, and seed 104282 on the earlier run). The solver reports the
  overspent totals in its own fuelUsed/timeUnitsUsed, violating the
  invariant the pipeline spec asserts.

Until the solver improves, expect the deep campaign to be red; the summary
block it prints (gap rate, mean/max gap, worst seeds) is the number to
watch.
