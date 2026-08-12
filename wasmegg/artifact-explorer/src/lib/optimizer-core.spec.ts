import { describe, it, expect } from 'vitest';
import { ei } from 'lib';
import { optimizeFull } from './optimizer-core';
import { computeCraftChainTree } from './optimizer-tree';
import { makeNode, makeOpt } from './spec-helpers';
import type { RecipeDAG } from './types';

const Name = ei.ArtifactSpec.Name;

// Root 'A' (craftable) needing one leaf ingredient 'B'. With pCraft > 0,
// missions yielding B produce positive score, so the optimizer has a reason
// to launch.
function craftDag(pCraft = 0.1): RecipeDAG {
  return new Map([
    ['A', makeNode('A', false, [['B', 1]], pCraft)],
    ['B', makeNode('B', true)],
  ]);
}

describe('optimizeFull', () => {
  it('handles an empty option list', async () => {
    const sol = await optimizeFull({
      options: [],
      recipeDag: craftDag(),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1000,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    expect(sol.bestProbability).toBeCloseTo(0, 9);
    expect(sol.choiceHistory).toHaveLength(0);
    expect(sol.fuelUsed).toBeCloseTo(0, 9);
  });

  it('uses the full time budget for a zero-fuel option', async () => {
    // 10s per launch, 100s horizon, 3 slots: 10 launches per slot -> 30 B
    const sol = await optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1_000_000,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    expect(sol.timeUnitsUsed).toBeLessThanOrEqual(100);
    const yieldB = sol.finalYieldVector.get('B') ?? 0;
    expect(yieldB).toBeGreaterThanOrEqual(30);
  });

  it('respects a tighter time budget exactly', async () => {
    // 10s per launch, 50s per-slot horizon, 3 slots: 5 launches per slot -> 15 B,
    // and each slot filled to 50s so the wall-clock makespan is 50
    const sol = await optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1_000_000,
      timeCapacity: 50,
      baseYield: new Map(),
    });
    expect(sol.timeUnitsUsed).toBe(50);
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(15, 9);
  });

  it('respects the fuel budget', async () => {
    // 100 fuel per launch, 300 budget: 3 launches
    const sol = await optimizeFull({
      options: [makeOpt(100, 1, [['B', 1]])],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 300,
      timeCapacity: 10_000,
      baseYield: new Map(),
    });
    expect(sol.fuelUsed).toBeLessThanOrEqual(300);
    expect(sol.fuelUsed).toBeCloseTo(300, 6);
  });

  it('does not allocate an option dominated on yield', async () => {
    const opt0 = makeOpt(10, 10, [['B', 1]], [], Name.LUNAR_TOTEM); // same cost, half the yield
    const opt1 = makeOpt(10, 10, [['B', 2]], [], Name.TUNGSTEN_ANKH);
    const sol = await optimizeFull({
      options: [opt0, opt1],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    // 10 launches of opt1, 20 B
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(20, 6);
    expect(sol.choiceHistory.find(c => c.targetAfxId === opt0.targetAfxId)).toBeUndefined();
    expect(sol.choiceHistory.find(c => c.targetAfxId === opt1.targetAfxId)).toBeDefined();
  });

  it('does not prune the only source of a direct legendary drop', async () => {
    // optBulk dominates optDropper on every ingredient-side dimension, but
    // optDropper is the only direct source of the target's legendary. A
    // dominance check that ignored legendary vectors would prune it, costing
    // the ~0.669 mixed plan in favour of optBulk's ~0.580.
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 11]], 0.04)],
      ['B', makeNode('B', true)],
    ]);
    const optBulk = makeOpt(0, 6.14, [['B', 2.69]], [], Name.LUNAR_TOTEM);
    const optDropper = makeOpt(3.49, 6.27, [['B', 1.95]], [['A', 0.05]], Name.TUNGSTEN_ANKH);
    const sol = await optimizeFull({
      options: [optBulk, optDropper],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 18.56,
      timeCapacity: 179.54,
      baseYield: new Map(),
    });

    expect(sol.choiceHistory.find(c => c.targetAfxId === optDropper.targetAfxId)).toBeDefined();
    expect(sol.dropProbability).toBeGreaterThan(0);
    expect(sol.bestProbability).toBeGreaterThan(0.65);
  });

  it('allocates complementary options together', async () => {
    // A needs both B and C; one option yields each, neither dominates.
    // The budget should be split between them.
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
          ],
          0.5
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
    ]);
    const optB = makeOpt(10, 10, [['B', 1]], [], Name.LUNAR_TOTEM);
    const optC = makeOpt(10, 10, [['C', 1]], [], Name.TUNGSTEN_ANKH);
    const sol = await optimizeFull({
      options: [optB, optC],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 200,
      timeCapacity: 200,
      baseYield: new Map(),
    });
    expect(sol.choiceHistory.length).toBe(2);
    expect(sol.finalYieldVector.get('B') ?? 0).toBeGreaterThanOrEqual(9);
    expect(sol.finalYieldVector.get('C') ?? 0).toBeGreaterThanOrEqual(9);
  });

  it('allocates three distinct options when two cannot reach the optimum', async () => {
    // A needs B, C and D, with one option per ingredient. Any pair leaves
    // the third ingredient at zero, so only the triple scan can find the
    // (10, 10, 10) allocation.
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
            ['D', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
      ['D', makeNode('D', true)],
    ]);
    const optB = makeOpt(10, 10, [['B', 1]], [], Name.LUNAR_TOTEM);
    const optC = makeOpt(10, 10, [['C', 1]], [], Name.TUNGSTEN_ANKH);
    const optD = makeOpt(10, 10, [['D', 1]], [], Name.DEMETERS_NECKLACE);
    const sol = await optimizeFull({
      options: [optB, optC, optD],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 300,
      timeCapacity: 300,
      baseYield: new Map(),
    });
    expect(sol.choiceHistory.length).toBe(3);
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(10, 6);
    expect(sol.finalYieldVector.get('C')).toBeCloseTo(10, 6);
    expect(sol.finalYieldVector.get('D')).toBeCloseTo(10, 6);
    expect(sol.expectedCrafts).toBeCloseTo(10, 6);
  });

  it('does not allocate an option dominated on cost alone', async () => {
    const optExpensive = makeOpt(20, 10, [['B', 1]], [], Name.LUNAR_TOTEM);
    const optCheap = makeOpt(10, 10, [['B', 1]], [], Name.TUNGSTEN_ANKH); // same yield, half the fuel
    const sol = await optimizeFull({
      options: [optExpensive, optCheap],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    expect(sol.choiceHistory.find(c => c.targetAfxId === optExpensive.targetAfxId)).toBeUndefined();
    expect(sol.choiceHistory.find(c => c.targetAfxId === optCheap.targetAfxId)).toBeDefined();
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(10, 6);
  });

  it('values direct legendary drops when crafting is impossible', async () => {
    // pCraft=0, so the only value is the 0.1 legendary drop rate. 10 launches
    // give lambda=1 and drop probability 1 - e^-1.
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]], 0)],
      ['B', makeNode('B', true)],
    ]);
    const optLeg = makeOpt(10, 10, [['B', 1]], [['A', 0.1]]);
    const sol = await optimizeFull({
      options: [optLeg],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    expect(sol.craftProbability).toBeCloseTo(0, 9);
    expect(sol.dropProbability).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(sol.bestProbability).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it('pairs a zero-fuel option with a fueled one', async () => {
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
    ]);
    const optZ = makeOpt(0, 10, [['B', 1]], [], Name.LUNAR_TOTEM);
    const optP = makeOpt(10, 10, [['C', 1]], [], Name.TUNGSTEN_ANKH);
    const sol = await optimizeFull({
      options: [optZ, optP],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 200,
      baseYield: new Map(),
    });
    expect(sol.choiceHistory.find(c => c.targetAfxId === optZ.targetAfxId)).toBeDefined();
    expect(sol.choiceHistory.find(c => c.targetAfxId === optP.targetAfxId)).toBeDefined();
    // C is fuel-bound at 10; crafts = min(B, C) = 10. B (zero fuel) is at least
    // enough to match C — any surplus free B is optimal-equivalent.
    expect(sol.finalYieldVector.get('C')).toBeCloseTo(10, 6);
    expect(sol.finalYieldVector.get('B') ?? 0).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(sol.expectedCrafts).toBeCloseTo(10, 6);
    expect(sol.timeUnitsUsed).toBeLessThanOrEqual(200);
    expect(sol.fuelUsed).toBeCloseTo(100, 6);
  });

  it('reaches the brute-force optimum on a tight-fuel mix', async () => {
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
    ]);
    const opt0 = makeOpt(
      0,
      3,
      [
        ['B', 0.8],
        ['C', 1.5],
      ],
      [],
      Name.LUNAR_TOTEM
    );
    const opt1 = makeOpt(
      1,
      3,
      [
        ['B', 2.43],
        ['C', 2.03],
      ],
      [],
      Name.TUNGSTEN_ANKH
    );
    const opt2 = makeOpt(
      2,
      2,
      [
        ['B', 1.36],
        ['C', 0.61],
      ],
      [],
      Name.DEMETERS_NECKLACE
    );
    const sol = await optimizeFull({
      options: [opt0, opt1, opt2],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 6,
      timeCapacity: 8,
      baseYield: new Map(),
    });
    // Fuel binds at 6; the brute-force optimum is 6x opt1 -> min(B,C) = 12.18
    // crafts, which a dual filter that wrongly pruned opt1 would miss.
    expect(sol.expectedCrafts).toBeCloseTo(12.18, 2);
    expect(sol.choiceHistory.some(c => c.targetAfxId === opt1.targetAfxId)).toBe(true);
  });

  it('keeps every mission of an allocation longest-first packing would strand', async () => {
    // Seed 1207's shape: the relaxed allocation is already exactly 3-bin
    // packable, and best-fit-decreasing still drops one mission.
    //
    // A needs B, C and D; the three options are perfectly complementary, so the
    // 3S optimum equalizes the ingredients at 1x60s + 2x24s + 4x18s = 180s = 3S,
    // which partitions as (60) (24+18+18) (24+18+18). Longest-first best fit
    // instead builds (60) (24+24) (18+18+18) and strands the fourth 18s mission,
    // costing a quarter of the D supply and hence a quarter of the crafts.
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
            ['D', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
      ['D', makeNode('D', true)],
    ]);
    const optB = makeOpt(0, 60, [['B', 6]], [], Name.LUNAR_TOTEM);
    const optC = makeOpt(0, 24, [['C', 3]], [], Name.TUNGSTEN_ANKH);
    const optD = makeOpt(0, 18, [['D', 1.5]], [], Name.DEMETERS_NECKLACE);
    const sol = await optimizeFull({
      options: [optB, optC, optD],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1_000_000,
      timeCapacity: 60,
      baseYield: new Map(),
    });

    const launched = new Map(sol.choiceHistory.map(c => [c.targetAfxId, c.numShipsLaunched]));
    expect(launched.get(optB.targetAfxId)).toBe(1);
    expect(launched.get(optC.targetAfxId)).toBe(2);
    expect(launched.get(optD.targetAfxId)).toBe(4);
    expect(sol.finalYieldVector.get('D')).toBeCloseTo(6, 6);
    expect(sol.expectedCrafts).toBeCloseTo(6, 6);
    // Every slot is filled to the horizon exactly; nothing was stranded.
    expect(sol.timeUnitsUsed).toBe(60);
    expect((sol.slots ?? []).reduce((n, s) => n + s.missionCount, 0)).toBe(7);
  });

  it('takes an exchange out of a budget-maximal plan', async () => {
    // chunky-knapsack:1089's shape, shrunk: the plan the projection stages reach
    // spends the fuel budget to the last unit, so no `+1` of anything fits and
    // no `-1` can help — score is non-decreasing in inventory. Only swapping one
    // mission for another improves, which every stage upstream of polish is
    // structurally unable to do: they search aggregate 3S time and then project
    // into three bins by adding or dropping.
    //
    // Without the exchange the solver stops at 1x optSwapOut + 2x optFiller
    // (X=9.1, Y=14.5 -> 9.1 crafts); trading one filler for optSwapIn balances
    // the two ingredients at 11 each. Verified against a brute force over every
    // packable allocation inside both budgets: [1,1,1] at 11 crafts is optimal.
    const dag: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['X', 1],
            ['Y', 1],
          ],
          0.1
        ),
      ],
      ['X', makeNode('X', true)],
      ['Y', makeNode('Y', true)],
    ]);
    const optBase = makeOpt(
      10,
      26,
      [
        ['X', 4.5],
        ['Y', 5.9],
      ],
      [],
      Name.LUNAR_TOTEM
    );
    const optSwapIn = makeOpt(
      7,
      76,
      [
        ['X', 4.2],
        ['Y', 0.8],
      ],
      [],
      Name.TUNGSTEN_ANKH
    );
    const optFiller = makeOpt(
      7,
      12,
      [
        ['X', 2.3],
        ['Y', 4.3],
      ],
      [],
      Name.DEMETERS_NECKLACE
    );
    const sol = await optimizeFull({
      options: [optBase, optSwapIn, optFiller],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 24,
      timeCapacity: 82,
      baseYield: new Map(),
    });

    const launched = new Map(sol.choiceHistory.map(c => [c.targetAfxId, c.numShipsLaunched]));
    expect(launched.get(optBase.targetAfxId)).toBe(1);
    expect(launched.get(optSwapIn.targetAfxId)).toBe(1);
    expect(launched.get(optFiller.targetAfxId)).toBe(1);
    expect(sol.finalYieldVector.get('X')).toBeCloseTo(11, 6);
    expect(sol.finalYieldVector.get('Y')).toBeCloseTo(11, 6);
    expect(sol.expectedCrafts).toBeCloseTo(11, 6);
    // Budget-maximal, and the reported slots come off the accepted witness:
    // 76s alone in one slot, 26+12 in another.
    expect(sol.fuelUsed).toBeCloseTo(24, 9);
    expect(sol.timeUnitsUsed).toBe(76);
    expect((sol.slots ?? []).map(s => s.loadSeconds).sort((a, b) => a - b)).toEqual([0, 38, 76]);
  });

  it('snapshots base_yield and keeps it out of the dropped column', async () => {
    const root = 'puzzle-cube-2';
    const leaf = 'puzzle-cube-1';
    const dag: RecipeDAG = new Map([
      [root, makeNode(root, false, [[leaf, 1]], 0.1)],
      [leaf, makeNode(leaf, true)],
    ]);
    const sol = await optimizeFull({
      options: [makeOpt(0, 10, [[leaf, 1]])],
      recipeDag: dag,
      desiredArtifactNodeIds: [root],
      fuelCapacity: 1_000_000,
      timeCapacity: 50,
      baseYield: new Map([[leaf, 5]]),
    });
    expect(sol.baseYield.get(leaf)).toBe(5);
    // 10s per launch, 50s per-slot horizon, 3 slots: 5 per slot -> 15 dropped
    expect(sol.finalYieldVector.get(leaf)).toBeCloseTo(20, 9); // 5 owned + 15 dropped
    const leafNode = computeCraftChainTree(sol, root, null)?.children.find(n => n.nodeId === leaf);
    expect(leafNode).toBeDefined();
    expect(leafNode!.metrics.dropped).toBeCloseTo(15, 9);
  });

  it('never exceeds either budget', async () => {
    const opts = [makeOpt(40, 5, [['B', 1]]), makeOpt(60, 8, [['B', 2]]), makeOpt(0, 3, [['B', 1]])];
    const sol = await optimizeFull({
      options: opts,
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 50,
      baseYield: new Map(),
    });
    expect(sol.fuelUsed).toBeLessThanOrEqual(100 + 1e-6);
    expect(sol.timeUnitsUsed).toBeLessThanOrEqual(51); // +1 for integer rounding
    expect(sol.choiceHistory.length).toBeGreaterThan(0);
  });

  it('treats a NaN or negative budget as zero (no launches)', async () => {
    // An empty input field upstream arrives as NaN; degrade to the no-launch
    // baseline rather than leak it into the scans.
    const opts = [makeOpt(10, 10, [['B', 1]]), makeOpt(0, 3, [['B', 1]])];
    for (const timeCapacity of [NaN, -5, Infinity]) {
      const sol = await optimizeFull({
        options: opts,
        recipeDag: craftDag(0.1),
        desiredArtifactNodeIds: ['A'],
        fuelCapacity: 1000,
        timeCapacity,
        baseYield: new Map(),
      });
      expect(sol.choiceHistory).toHaveLength(0);
      expect(sol.fuelUsed).toBe(0);
      expect(sol.timeUnitsUsed).toBe(0);
      expect(Number.isFinite(sol.bestProbability)).toBe(true);
    }
    const solNaNFuel = await optimizeFull({
      options: opts,
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: NaN,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    // the zero-fuel option is still launchable against the time budget
    expect(solNaNFuel.fuelUsed).toBe(0);
    expect(solNaNFuel.timeUnitsUsed).toBeLessThanOrEqual(100);
  });
});
