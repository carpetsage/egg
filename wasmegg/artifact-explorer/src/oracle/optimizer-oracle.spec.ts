// Brute-force oracle harness for the heuristic outer solver.
//
// The optimizer is treated as a black box: the only things this file knows
// about it are the public entry point optimizeFull, the input/output types,
// and the documented objective (header comment of optimizer-core.ts). The
// oracle re-derives every number through disparate logic — an exact rational
// simplex over the recipe DAG plus exhaustive enumeration of integer launch
// allocations — and checks three properties per instance:
//
//   1. feasibility — the returned plan respects the fuel/time budgets and
//      the reported totals match the plan;
//   2. honesty     — the reported probability equals an independent
//      re-evaluation of the returned plan;
//   3. optimality  — no feasible allocation beats the plan by more than
//      ORACLE_GAP_TOL in probability.
//
// Tiers:
//   - calibration probes + smoke fuzz always run (seconds);
//   - the deep fuzz loop only runs with RUN_ORACLE=1 (pnpm test:oracle) and
//     is time-boxed by ORACLE_TIME_BUDGET_MS (default 25 minutes).
//
// Tunables (env): ORACLE_GAP_TOL (default 1e-3, matching the solver's own
// documented epsilon scale), ORACLE_HONESTY_TOL (default 1e-6),
// ORACLE_TIME_BUDGET_MS, ORACLE_SEED_BASE.

import { describe, expect, test } from 'vitest';

import { optimizeFull } from '../lib/optimizer-core';
import type { OptimizerSolution } from '../lib/types';
import { makeNode, makeOpt } from '../lib/spec-helpers';
import { bruteForceBest } from './enumerate';
import { evaluateAllocation, OracleInstance, targetQ } from './evaluate';
import { FAMILIES, Family, generateInstance } from './generate';

const GAP_TOL = Number(process.env.ORACLE_GAP_TOL ?? 1e-3);
// the always-on smoke tier only guards against catastrophic gaps; fine-grained
// optimality gauging is the deep campaign's job
const SMOKE_GAP_TOL = Math.max(GAP_TOL, 0.05);
const HONESTY_TOL = Number(process.env.ORACLE_HONESTY_TOL ?? 1e-6);
const DEEP = process.env.RUN_ORACLE === '1';
const BUDGET_MS = Number(process.env.ORACLE_TIME_BUDGET_MS ?? 25 * 60_000);
const SEED_BASE = Number(process.env.ORACLE_SEED_BASE ?? 1000);

interface InstanceFailure {
  family: string;
  seed: number;
  kind: 'reconstruction' | 'feasibility' | 'honesty' | 'optimality' | 'harness';
  detail: string;
}

interface InstanceOutcome {
  family: string;
  seed: number;
  gap: number; // oracle best probability minus plan probability (>= 0)
  failures: InstanceFailure[];
}

function runOptimizer(inst: OracleInstance): OptimizerSolution {
  return optimizeFull({
    options: inst.options,
    recipeDag: inst.dag,
    desiredArtifactNodeIds: inst.targets,
    fuelCapacity: inst.fuelCapacity,
    timeCapacity: inst.timeCapacity,
    baseYield: inst.baseYield,
  });
}

// numShipsLaunched counts individual ships, while costs and yields are per
// batch. The ships-per-batch constant is not part of the public types, so it
// is measured once from a probe whose true batch count is provable from the
// reported probability alone: with only a direct-drop option (0.125 expected
// legendaries per batch, 3 batches affordable), probability is strictly
// monotone in batches, so a report of 1 - e^-0.375 pins the plan at exactly
// 3 batches.
let shipsPerBatchMemo: number | null = null;
function shipsPerBatch(): number {
  if (shipsPerBatchMemo !== null) {
    return shipsPerBatchMemo;
  }
  const dag = new Map(
    [makeNode('probe-leaf', true), makeNode('probe-t', false, [['probe-leaf', 1]], 0.4)].map(n => [n.id, n] as const)
  );
  const solution = optimizeFull({
    options: [makeOpt(2, 1, [], [['probe-t', 0.125]])],
    recipeDag: dag,
    desiredArtifactNodeIds: ['probe-t'],
    fuelCapacity: 6,
    timeCapacity: 100,
    baseYield: new Map(),
  });
  const batches = 3;
  if (Math.abs(solution.bestProbability - (1 - Math.exp(-batches * 0.125))) > 1e-9) {
    throw new Error('ships-per-batch probe did not land on the provable optimum');
  }
  const ships = solution.choiceHistory.reduce((sum, h) => sum + h.numShipsLaunched, 0);
  if (!Number.isInteger(ships / batches) || ships / batches < 1) {
    throw new Error(`ships-per-batch probe measured non-integer scale ${ships}/${batches}`);
  }
  shipsPerBatchMemo = ships / batches;
  return shipsPerBatchMemo;
}

// choiceHistory entries don't carry the option id, but the generator
// guarantees each option has a unique (fuel, time, target) triple — real
// options from the same mission share fuel and time across targets, so the
// target is a necessary part of the key
function reconstructAllocation(inst: OracleInstance, solution: OptimizerSolution): number[] {
  const scale = shipsPerBatch();
  const allocation = new Array<number>(inst.options.length).fill(0);
  for (const launch of solution.choiceHistory) {
    if (launch.numShipsLaunched === 0) {
      continue;
    }
    const idx = inst.options.findIndex(
      opt =>
        opt.actualFuel === launch.actualFuel &&
        opt.actualTime === launch.actualTime &&
        opt.targetAfxId === launch.targetAfxId
    );
    if (idx === -1) {
      throw new Error(
        `choiceHistory entry (fuel=${launch.actualFuel}, time=${launch.actualTime}, target=${launch.targetAfxId}) matches no input option`
      );
    }
    const batches = launch.numShipsLaunched / scale;
    if (!Number.isInteger(batches) || batches < 0) {
      throw new Error(`ship count ${launch.numShipsLaunched} is not a whole number of ${scale}-ship batches`);
    }
    allocation[idx] += batches;
  }
  return allocation;
}

// probability of at least one legendary across all targets, as claimed by the
// solver's perTarget report
function claimedProbability(solution: OptimizerSolution, inst: OracleInstance): number {
  let oneMinus = 1;
  for (const target of inst.targets) {
    const per = solution.perTarget.find(p => p.nodeId === target);
    if (!per) {
      throw new Error(`perTarget missing entry for ${target}`);
    }
    oneMinus *= 1 - per.bestProbability;
  }
  return 1 - oneMinus;
}

// Second opinion on an oracle-found allocation, using only the public API:
// collapse the allocation into a single synthetic launch option carrying its
// aggregate yields, offer it under a budget that fits exactly one batch, and
// let the solver price it with its own value function. Because the objective
// is monotone in inventory, taking that one batch is trivially optimal, so
// the returned probability is the solver's own valuation of the oracle plan.
function solverPricesAllocation(inst: OracleInstance, allocation: number[]): number {
  const yields = new Map<string, number>();
  const legendary = new Map<string, number>();
  inst.options.forEach((opt, i) => {
    for (const [item, qty] of opt.yieldVector) {
      yields.set(item, (yields.get(item) ?? 0) + allocation[i] * qty);
    }
    for (const [item, qty] of opt.legendaryYieldVector) {
      legendary.set(item, (legendary.get(item) ?? 0) + allocation[i] * qty);
    }
  });
  const solution = optimizeFull({
    options: [makeOpt(1, 1, [...yields], [...legendary])],
    recipeDag: inst.dag,
    desiredArtifactNodeIds: inst.targets,
    fuelCapacity: 1,
    timeCapacity: 1,
    baseYield: inst.baseYield,
  });
  return claimedProbability(solution, inst);
}

function checkInstance(inst: OracleInstance, gapTol = GAP_TOL): InstanceOutcome {
  const failures: InstanceFailure[] = [];
  const fail = (kind: InstanceFailure['kind'], detail: string) =>
    failures.push({ family: inst.label, seed: inst.seed, kind, detail });

  const solution = runOptimizer(inst);

  let allocation: number[];
  try {
    allocation = reconstructAllocation(inst, solution);
  } catch (err) {
    fail('reconstruction', String(err));
    return { family: inst.label, seed: inst.seed, gap: NaN, failures };
  }

  // tolerances are relative: real fuel costs run to billions of eggs
  const fuelUsed = allocation.reduce((sum, k, i) => sum + k * inst.options[i].actualFuel, 0);
  const timeUsed = allocation.reduce((sum, k, i) => sum + k * inst.options[i].actualTime, 0);
  const slack = (x: number) => 1e-9 * Math.max(1, x);
  if (
    fuelUsed > inst.fuelCapacity + slack(inst.fuelCapacity) ||
    timeUsed > inst.timeCapacity + slack(inst.timeCapacity)
  ) {
    fail('feasibility', `plan uses fuel=${fuelUsed}/${inst.fuelCapacity}, time=${timeUsed}/${inst.timeCapacity}`);
    return { family: inst.label, seed: inst.seed, gap: NaN, failures };
  }
  if (
    Math.abs(solution.fuelUsed - fuelUsed) > 1e-6 * Math.max(1, fuelUsed) ||
    Math.abs(solution.timeUnitsUsed - timeUsed) > 1e-6 * Math.max(1, timeUsed)
  ) {
    fail(
      'feasibility',
      `reported usage fuel=${solution.fuelUsed}, time=${solution.timeUnitsUsed} but plan uses fuel=${fuelUsed}, time=${timeUsed}`
    );
  }

  const planEval = evaluateAllocation(inst, allocation);
  const claimed = claimedProbability(solution, inst);
  if (Math.abs(claimed - planEval.probability) > HONESTY_TOL) {
    fail('honesty', `claimed p=${claimed} vs independent p=${planEval.probability} for allocation [${allocation}]`);
  } else if (claimed < 1 && planEval.score < 30) {
    // below the float-saturation point of 1 - e^-score, also compare in score
    // space, which stays sharp where probabilities compress toward 1; the
    // claimed value round-trips through probability space, whose one-ulp
    // granularity near p = 1 corresponds to a score error of ~ulp(1) * e^score
    const claimedScore = -Math.log(1 - claimed);
    const roundTripResolution = 4e-16 * Math.exp(planEval.score);
    if (Math.abs(claimedScore - planEval.score) > HONESTY_TOL * (1 + planEval.score) + roundTripResolution) {
      fail('honesty', `claimed score ${claimedScore} vs independent ${planEval.score} for allocation [${allocation}]`);
    }
  }

  const oracle = bruteForceBest(inst);
  const gap = Math.max(0, oracle.bestProbability - planEval.probability);
  if (gap > gapTol) {
    // ask the solver itself to price the oracle's allocation; if its own
    // value function agrees the alternative is better, the gap cannot be an
    // artifact of the oracle's independent model
    const solverView = solverPricesAllocation(inst, oracle.bestAllocation);
    const confirmed = solverView - planEval.probability > GAP_TOL / 2;
    fail(
      'optimality',
      `plan [${allocation}] p=${planEval.probability.toFixed(6)} but oracle found [${oracle.bestAllocation}] ` +
        `p=${oracle.bestProbability.toFixed(6)} (gap ${gap.toExponential(3)}, ` +
        `solver's own pricing of that allocation: ${solverView.toFixed(6)} — ` +
        `${confirmed ? 'CONFIRMED by solver value function' : 'NOT confirmed; possible oracle model divergence'}, ` +
        `${oracle.evaluatedCount} allocations checked)`
    );
  }

  return { family: inst.label, seed: inst.seed, gap, failures };
}

function summarize(outcomes: InstanceOutcome[]): string {
  const lines: string[] = [];
  let gapCount = 0;
  let nonZero = 0;
  let maxGap = 0;
  let gapSum = 0;
  for (const o of outcomes) {
    if (Number.isNaN(o.gap)) {
      continue;
    }
    gapCount++;
    gapSum += o.gap;
    if (o.gap > maxGap) {
      maxGap = o.gap;
    }
    if (o.gap > 1e-12) {
      nonZero++;
    }
  }
  lines.push(
    `oracle: ${outcomes.length} instances, ${nonZero} with a nonzero optimality gap, ` +
      `max gap ${gapCount ? maxGap.toExponential(3) : 'n/a'}, ` +
      `mean gap ${gapCount ? (gapSum / gapCount).toExponential(3) : 'n/a'}`
  );
  const byFamily = new Map<string, number>();
  for (const o of outcomes) {
    byFamily.set(o.family, (byFamily.get(o.family) ?? 0) + 1);
  }
  lines.push(`per family: ${[...byFamily].map(([f, n]) => `${f}=${n}`).join(', ')}`);
  const worst = outcomes
    .filter(o => !Number.isNaN(o.gap) && o.gap > 1e-12)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);
  for (const o of worst) {
    lines.push(`  worst: family=${o.family} seed=${o.seed} gap=${o.gap.toExponential(3)}`);
  }
  return lines.join('\n');
}

function assertNoFailures(outcomes: InstanceOutcome[]): void {
  const failures = outcomes.flatMap(o => o.failures);
  if (failures.length > 0) {
    const byBucket = new Map<string, number>();
    for (const f of failures) {
      const key = `${f.family}/${f.kind}`;
      byBucket.set(key, (byBucket.get(key) ?? 0) + 1);
    }
    console.log(`failure breakdown: ${[...byBucket].map(([k, n]) => `${k}=${n}`).join(', ')}`);
    // sample a few failures of every kind so a flood of one kind can't hide
    // the others
    const byKind = new Map<string, InstanceFailure[]>();
    for (const f of failures) {
      const list = byKind.get(f.kind) ?? [];
      if (list.length < 8) {
        list.push(f);
      }
      byKind.set(f.kind, list);
    }
    for (const [, list] of byKind) {
      for (const f of list) {
        console.log(`  ${f.family} seed=${f.seed} [${f.kind}] ${f.detail}`);
      }
    }
  }
  expect(failures.slice(0, 10)).toEqual([]);
  expect(failures.length).toBe(0);
}

// ---------------------------------------------------------------------------
// Calibration probes: instances so small the optimum is unambiguous, checked
// against closed-form arithmetic. If these fail, either the solver is broken
// on trivial input or the oracle's model of the contract is wrong — both void
// the fuzz results, so they run first and unconditionally.
// ---------------------------------------------------------------------------

describe('oracle calibration', () => {
  test('inventory-only crafting matches closed form', () => {
    const p = 0.5;
    const inst: OracleInstance = {
      label: 'probe',
      seed: 0,
      options: [],
      dag: new Map(
        [
          makeNode('a', true),
          makeNode('b', true),
          makeNode(
            't',
            false,
            [
              ['a', 2],
              ['b', 1],
            ],
            p
          ),
        ].map(n => [n.id, n])
      ),
      targets: ['t'],
      fuelCapacity: 0,
      timeCapacity: 0,
      baseYield: new Map([
        ['a', 5],
        ['b', 1.5],
      ]),
    };
    // crafts limited by b: min(5/2, 1.5) = 1.5
    const crafts = 1.5;
    const expected = 1 - Math.exp(-crafts * targetQ(inst, 't'));

    const mine = evaluateAllocation(inst, []);
    expect(mine.expectedCrafts).toBeCloseTo(crafts, 9);
    expect(mine.probability).toBeCloseTo(expected, 9);

    const theirs = runOptimizer(inst);
    expect(theirs.expectedCrafts).toBeCloseTo(crafts, 6);
    expect(theirs.craftProbability).toBeCloseTo(expected, 6);
    expect(theirs.bestProbability).toBeCloseTo(expected, 6);
  });

  test('direct legendary drops match closed form', () => {
    const inst: OracleInstance = {
      label: 'probe',
      seed: 0,
      options: [makeOpt(2, 1, [], [['t', 0.125]])],
      dag: new Map([makeNode('a', true), makeNode('t', false, [['a', 1]], 0.4)].map(n => [n.id, n])),
      targets: ['t'],
      fuelCapacity: 6,
      timeCapacity: 100,
      baseYield: new Map(),
    };
    // no craftable supply at all, so the only play is 3 launches of drops
    const expected = 1 - Math.exp(-3 * 0.125);
    const theirs = runOptimizer(inst);
    expect(theirs.craftProbability).toBeCloseTo(0, 6);
    expect(theirs.dropProbability).toBeCloseTo(expected, 6);
    expect(theirs.bestProbability).toBeCloseTo(expected, 6);
    expect(evaluateAllocation(inst, [3]).probability).toBeCloseTo(expected, 9);
  });

  test('multi-level recipe matches closed form', () => {
    const inst: OracleInstance = {
      label: 'probe',
      seed: 0,
      options: [],
      dag: new Map(
        [
          makeNode('a', true),
          makeNode('mid', false, [['a', 2]]),
          makeNode(
            't',
            false,
            [
              ['mid', 1],
              ['a', 1],
            ],
            0.3
          ),
        ].map(n => [n.id, n])
      ),
      targets: ['t'],
      fuelCapacity: 0,
      timeCapacity: 0,
      baseYield: new Map([['a', 4]]),
    };
    // each craft consumes 1 mid (2a) + 1a = 3a, so crafts = 4/3
    const crafts = 4 / 3;
    const mine = evaluateAllocation(inst, []);
    expect(mine.expectedCrafts).toBeCloseTo(crafts, 9);
    const theirs = runOptimizer(inst);
    expect(theirs.expectedCrafts).toBeCloseTo(crafts, 6);
    expect(theirs.bestProbability).toBeCloseTo(1 - Math.exp(-crafts * targetQ(inst, 't')), 6);
  });

  test('launch yields feed crafting', () => {
    const inst: OracleInstance = {
      label: 'probe',
      seed: 0,
      options: [makeOpt(3, 1, [['a', 1.5]])],
      dag: new Map([makeNode('a', true), makeNode('t', false, [['a', 2]], 0.6)].map(n => [n.id, n])),
      targets: ['t'],
      fuelCapacity: 7,
      timeCapacity: 100,
      baseYield: new Map([['a', 1]]),
    };
    // 2 launches -> inventory a = 1 + 3 = 4 -> crafts = 2
    const expected = 1 - Math.exp(-2 * targetQ(inst, 't'));
    const theirs = runOptimizer(inst);
    expect(theirs.bestProbability).toBeCloseTo(expected, 6);
    expect(evaluateAllocation(inst, [2]).probability).toBeCloseTo(expected, 9);
  });

  test('multi-target allocation favors the higher-value target', () => {
    const inst: OracleInstance = {
      label: 'probe',
      seed: 0,
      options: [],
      dag: new Map(
        [makeNode('a', true), makeNode('t0', false, [['a', 1]], 0.5), makeNode('t1', false, [['a', 1]], 0.8)].map(n => [
          n.id,
          n,
        ])
      ),
      targets: ['t0', 't1'],
      fuelCapacity: 0,
      timeCapacity: 0,
      baseYield: new Map([['a', 2]]),
    };
    // both targets eat the same ingredient; all of it belongs on t1 (higher Q)
    const bestScore = 2 * targetQ(inst, 't1');
    const mine = evaluateAllocation(inst, []);
    expect(mine.score).toBeCloseTo(bestScore, 9);
    const theirs = runOptimizer(inst);
    expect(claimedProbability(theirs, inst)).toBeCloseTo(1 - Math.exp(-bestScore), 6);
  });
});

// ---------------------------------------------------------------------------
// Smoke fuzz: a deterministic handful of instances per family, fast enough
// for the default test run.
// ---------------------------------------------------------------------------

describe('oracle smoke fuzz', () => {
  test('optimizer within tolerance on smoke instances', () => {
    const outcomes: InstanceOutcome[] = [];
    for (const family of FAMILIES) {
      for (let seed = 1; seed <= 3; seed++) {
        const inst = generateInstance(family, seed);
        if (inst) {
          outcomes.push(checkInstance(inst, SMOKE_GAP_TOL));
        }
      }
    }
    console.log(summarize(outcomes));
    expect(outcomes.length).toBeGreaterThan(10);
    assertNoFailures(outcomes);
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Deep fuzz: time-boxed exhaustive campaign, gated behind RUN_ORACLE=1.
// ---------------------------------------------------------------------------

describe.skipIf(!DEEP)('oracle deep fuzz', () => {
  test(
    'optimizer within tolerance across the full campaign',
    () => {
      const started = Date.now();
      const outcomes: InstanceOutcome[] = [];
      let seed = SEED_BASE;
      let skipped = 0;
      // round-robin the families so an early exhaustion of the time budget
      // still leaves balanced coverage
      outer: for (;;) {
        for (const family of FAMILIES) {
          if (Date.now() - started > BUDGET_MS) {
            break outer;
          }
          try {
            const inst = generateInstance(family as Family, seed);
            if (!inst) {
              skipped++;
              continue;
            }
            outcomes.push(checkInstance(inst));
          } catch (err) {
            // a crash on one instance must not sink a half-hour campaign,
            // but it is still a reportable defect of harness or solver
            outcomes.push({
              family,
              seed,
              gap: NaN,
              failures: [{ family, seed, kind: 'harness', detail: String(err) }],
            });
          }
        }
        seed++;
      }
      console.log(summarize(outcomes));
      console.log(
        `deep fuzz: seeds ${SEED_BASE}..${seed}, ${skipped} oversized instances skipped, ` +
          `${((Date.now() - started) / 60_000).toFixed(1)} minutes`
      );
      expect(outcomes.length).toBeGreaterThan(50);
      assertNoFailures(outcomes);
    },
    BUDGET_MS + 5 * 60_000
  );
});
