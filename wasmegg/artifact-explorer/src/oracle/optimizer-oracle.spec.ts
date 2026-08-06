// Brute-force oracle harness for the heuristic outer solver. Treats the
// optimizer as a black box and checks three properties per instance:
// feasibility (fuel budget and 3-slot packing), honesty (reported probability
// matches an independent re-evaluation), and optimality (no feasible
// allocation beats the plan by more than ORACLE_GAP_TOL).
//
// Calibration probes and smoke fuzz always run; the deep fuzz campaign runs
// with RUN_ORACLE=1 (pnpm test:oracle), time-boxed by ORACLE_TIME_BUDGET_MS.

import { describe, expect, test } from 'vitest';

import { optimizeFull } from '../lib/optimizer-core';
import type { OptimizerSolution } from '../lib/types';
import { makeNode, makeOpt } from '../lib/spec-helpers';
import { bruteForceBestJoint, packableInto3Bins } from './enumerate';
import { evaluateAllocation, evaluateAllocationJoint, OracleInstance, targetQ } from './evaluate';
import { FAMILIES, Family, generateInstance } from './generate';

const GAP_TOL = Number(process.env.ORACLE_GAP_TOL ?? 1e-3);
// the smoke tier only guards against catastrophic gaps
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

// choiceHistory entries don't carry the option id, but the generator
// guarantees each option a unique (fuel, time, target) triple.
function reconstructAllocation(inst: OracleInstance, solution: OptimizerSolution): number[] {
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
    allocation[idx] += launch.numShipsLaunched;
  }
  return allocation;
}

// Second opinion on an oracle-found allocation: collapse it into one synthetic
// take-it-or-leave-it option and let the solver price it, so a reported gap
// cannot be an oracle-model artifact.
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
  return solution.jointProbability;
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
  const slack = (x: number) => 1e-9 * Math.max(1, x);

  // Reduce the allocation to per-duration counts and check 3-slot packability
  // independently of the solver's own packer.
  const durList: number[] = [];
  const durCounts: number[] = [];
  const durIndex = new Map<number, number>();
  inst.options.forEach((opt, i) => {
    const key = Math.round(opt.actualTime);
    let di = durIndex.get(key);
    if (di === undefined) {
      di = durList.length;
      durList.push(opt.actualTime);
      durCounts.push(0);
      durIndex.set(key, di);
    }
    durCounts[di] += allocation[i];
  });
  if (fuelUsed > inst.fuelCapacity + slack(inst.fuelCapacity)) {
    fail('feasibility', `plan uses fuel=${fuelUsed}/${inst.fuelCapacity}`);
    return { family: inst.label, seed: inst.seed, gap: NaN, failures };
  }
  if (!packableInto3Bins(durCounts, durList, inst.timeCapacity)) {
    fail('feasibility', `plan [${allocation}] does not pack into 3 slots of ${inst.timeCapacity}s`);
    return { family: inst.label, seed: inst.seed, gap: NaN, failures };
  }

  // The slot witness must be self-consistent: every slot within the horizon,
  // mission counts summing to the plan, timeUnitsUsed = the busiest slot.
  const slots = solution.slots ?? [];
  const totalMissions = allocation.reduce((sum, k) => sum + k, 0);
  const slotMissionSum = slots.reduce((sum, sl) => sum + sl.missionCount, 0);
  const makespan = slots.reduce((m, sl) => Math.max(m, sl.loadSeconds), 0);
  for (const sl of slots) {
    if (sl.loadSeconds > inst.timeCapacity + slack(inst.timeCapacity)) {
      fail('feasibility', `slot load ${sl.loadSeconds} exceeds horizon ${inst.timeCapacity}`);
      return { family: inst.label, seed: inst.seed, gap: NaN, failures };
    }
  }
  if (slotMissionSum !== totalMissions) {
    fail('feasibility', `slot witness holds ${slotMissionSum} missions but plan has ${totalMissions}`);
    return { family: inst.label, seed: inst.seed, gap: NaN, failures };
  }
  if (
    Math.abs(solution.fuelUsed - fuelUsed) > 1e-6 * Math.max(1, fuelUsed) ||
    Math.abs(solution.timeUnitsUsed - Math.round(makespan)) > 1
  ) {
    fail(
      'feasibility',
      `reported usage fuel=${solution.fuelUsed}, time=${solution.timeUnitsUsed} but plan uses fuel=${fuelUsed}, makespan=${makespan}`
    );
  }

  // One checking path at every target count; at n=1 evaluateAllocationJoint
  // delegates to the exact-arithmetic union evaluator, so rigour is unchanged.
  const planEval = evaluateAllocationJoint(inst, allocation);
  const claimed = solution.jointProbability;
  const expected = planEval.jointProbability;
  for (const p of planEval.perTarget) {
    if (!solution.perTarget.some(q => q.nodeId === p.nodeId)) {
      fail('honesty', `perTarget missing entry for ${p.nodeId}`);
    }
  }
  if (Math.abs(claimed - expected) > HONESTY_TOL) {
    fail('honesty', `claimed jointProbability=${claimed} vs independent ${expected} for allocation [${allocation}]`);
  } else if (claimed > 0 && expected > 0) {
    // Log space too: joint probabilities span ~1e-8 to within an ulp of 1, so
    // a fixed 1e-6 band is vacuous at the bottom and unreachable at the top.
    // On the joint probability, never per target: the split is unpinned
    // wherever the objective is not strictly curved in it.
    const claimedLog = -Math.log(claimed);
    const expectedLog = -Math.log(expected);
    if (Math.abs(claimedLog - expectedLog) > HONESTY_TOL * (1 + expectedLog)) {
      fail(
        'honesty',
        `claimed -log(jointProbability)=${claimedLog} vs independent ${expectedLog} for allocation [${allocation}]`
      );
    }
  }

  const oracle = bruteForceBestJoint(inst);
  const gap = Math.max(0, oracle.bestJointProbability - planEval.jointProbability);
  if (gap > gapTol) {
    const solverView = solverPricesAllocation(inst, oracle.bestAllocation);
    const confirmed = solverView - planEval.jointProbability > GAP_TOL / 2;
    fail(
      'optimality',
      `plan [${allocation}] jointP=${planEval.jointProbability.toFixed(6)} but oracle found ` +
        `[${oracle.bestAllocation}] jointP=${oracle.bestJointProbability.toFixed(6)} ` +
        `(gap ${gap.toExponential(3)}, solver's own pricing of that allocation: ${solverView.toFixed(6)} — ` +
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

// Calibration probes: instances so small the optimum is unambiguous, checked
// against closed-form arithmetic. A failure here voids the fuzz results.
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

  test('single-target weighted-sum score still favors dumping everything on the higher-Q target', () => {
    // Checks the oracle's own weighted-sum LP re-derivation only. That score
    // is NOT what optimizeFull maximizes; see the next test.
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
    // under the plain weighted-sum score.
    const bestScore = 2 * targetQ(inst, 't1');
    const mine = evaluateAllocation(inst, []);
    expect(mine.score).toBeCloseTo(bestScore, 9);
  });

  test('multi-target allocation balances instead of favoring the higher-value target (joint/AND objective)', () => {
    // The true continuous optimum, found independently by calculus on
    // g(Q0*c0) + g(Q1*(2-c0)), balances at c0~1.16, c1~0.84, joint ~0.4095.
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
    const theirs = runOptimizer(inst);
    const crafts = theirs.perTarget.map(p => p.expectedCrafts);
    expect(Math.min(...crafts)).toBeGreaterThan(0.5); // balanced, not all-or-nothing
    expect(theirs.jointProbability).toBeCloseTo(0.409536, 2);
  });

  test('three-target joint plan matches the independent oracle (n=3, exercises N-general Frank-Wolfe)', () => {
    // Three targets sharing ingredient 'a': the search must split the
    // inventory three ways, since zeroing any target zeroes the AND.
    const inst: OracleInstance = {
      label: 'probe-n3',
      seed: 0,
      options: [makeOpt(2, 1, [['a', 2]]), makeOpt(3, 1, [['a', 3]])],
      dag: new Map(
        [
          makeNode('a', true),
          makeNode('t0', false, [['a', 1]], 0.5),
          makeNode('t1', false, [['a', 1]], 0.7),
          makeNode('t2', false, [['a', 1]], 0.3),
        ].map(n => [n.id, n])
      ),
      targets: ['t0', 't1', 't2'],
      fuelCapacity: 6,
      timeCapacity: 3,
      baseYield: new Map([['a', 1]]),
    };
    assertNoFailures([checkInstance(inst)]);
    const theirs = runOptimizer(inst);
    const crafts = theirs.perTarget.map(p => p.expectedCrafts);
    expect(theirs.perTarget).toHaveLength(3);
    expect(Math.min(...crafts)).toBeGreaterThan(0); // every target gets a share
  });

  test('three-target joint plan where targets consume each other (n=3 dependency chain)', () => {
    // Dependency chain: t0 feeds t1 feeds t2, so crafting up the chain
    // consumes the lower targets even though each craft is its own legendary
    // roll. A naive "split the shared ingredient" shortcut mishandles this.
    const inst: OracleInstance = {
      label: 'probe-chain',
      seed: 0,
      options: [makeOpt(2, 1, [['a', 3]]), makeOpt(3, 1, [['a', 5]])],
      dag: new Map(
        [
          makeNode('a', true),
          makeNode('t0', false, [['a', 1]], 0.4),
          makeNode(
            't1',
            false,
            [
              ['t0', 1],
              ['a', 1],
            ],
            0.5
          ),
          makeNode('t2', false, [['t1', 1]], 0.6),
        ].map(n => [n.id, n])
      ),
      targets: ['t0', 't1', 't2'],
      fuelCapacity: 6,
      timeCapacity: 3,
      baseYield: new Map([['a', 2]]),
    };
    assertNoFailures([checkInstance(inst)]);
    expect(runOptimizer(inst).perTarget).toHaveLength(3);
  });
});

// Smoke fuzz: a deterministic handful of instances per family.
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

// Deep fuzz: time-boxed campaign, gated behind RUN_ORACLE=1.
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
