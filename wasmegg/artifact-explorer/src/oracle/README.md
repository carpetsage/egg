# Brute-force oracle for the artifact optimizer

Correctness harness for the heuristic outer solver (`optimizeFull`). The
solver is treated as a black box: nothing here imports its internals, and the
three-slot packing feasibility check is re-derived independently.

Instances are built from real game data — production recipe DAGs, launch
options, and crafting-level legendary probabilities. The generator only
chooses the target(s), the mission subset, the budgets, and the owned
inventory. Because instances derive from live loot data, findings should be
reproduced against the loot snapshot they were found on.

For each instance the harness runs `optimizeFull` and checks:

1. **feasibility** — the plan respects the fuel budget, its missions pack
   into 3 slots each within the horizon, and the reported totals match;
2. **honesty** — the reported probability matches a re-evaluation by an
   independent evaluator (an exact BigInt-rational simplex derived from the
   documented objective);
3. **optimality** — no feasible allocation (found by exhaustive enumeration
   of maximal integer allocations) beats the plan by more than
   `ORACLE_GAP_TOL`. Any gap is re-priced through the solver's own value
   function as a second opinion.

Calibration probes with closed-form answers run first; if those fail, the
fuzz results are void.

Instance families: `random-single`, `random-multi` (two targets competing for
shared ingredients), `cheap-filler` (a budget remainder only a cheap mission
can use), `near-tie` (closest fuel costs), `chunky-knapsack` (expensive
missions under a tight budget), `edge` (zero/degenerate budgets, direct
legendary drops, time-bound plans).

## Running it

```sh
pnpm test          # calibration + smoke tier only (~seconds)
pnpm test:oracle   # + deep campaign, 25 minutes by default
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `ORACLE_TIME_BUDGET_MS` | 25 min | wall-clock budget of the deep campaign |
| `ORACLE_GAP_TOL` | `1e-3` | max tolerated optimality gap, in absolute probability |
| `ORACLE_HONESTY_TOL` | `1e-6` | tolerated reporting discrepancy |
| `ORACLE_SEED_BASE` | `1000` | first seed; change to explore fresh instances |

The always-on smoke tier asserts only a catastrophic-gap guard (0.05); the
deep campaign asserts the strict tolerance. Every failure line carries the
family and seed for exact reproduction (see `repro.spec.ts`).
