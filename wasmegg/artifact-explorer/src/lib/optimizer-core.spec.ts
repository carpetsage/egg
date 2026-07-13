import { describe, it, expect } from 'vitest';
import { ei } from 'lib';
import { optimizeFull } from './optimizer-core';
import { computeCraftChainRows } from './optimizer-views';
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
  it('handles an empty option list', () => {
    const sol = optimizeFull({
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

  it('uses the full time budget for a zero-fuel option', () => {
    // 10s per launch, 100s budget: 10 launches, 10 B
    const sol = optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1_000_000,
      timeCapacity: 100,
      baseYield: new Map(),
    });
    expect(sol.timeUnitsUsed).toBeLessThanOrEqual(100);
    const yieldB = sol.finalYieldVector.get('B') ?? 0;
    expect(yieldB).toBeGreaterThanOrEqual(10);
  });

  it('respects a tighter time budget exactly', () => {
    // 10s per launch, 50s budget: exactly 5 launches
    const sol = optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1_000_000,
      timeCapacity: 50,
      baseYield: new Map(),
    });
    expect(sol.timeUnitsUsed).toBe(50);
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(5, 9);
  });

  it('respects the fuel budget', () => {
    // 100 fuel per launch, 300 budget: 3 launches
    const sol = optimizeFull({
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

  it('prunes an option dominated on yield', () => {
    const opt0 = makeOpt(10, 10, [['B', 1]], [], Name.LUNAR_TOTEM); // same cost, half the yield
    const opt1 = makeOpt(10, 10, [['B', 2]], [], Name.TUNGSTEN_ANKH);
    const sol = optimizeFull({
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

  it('allocates complementary options together', () => {
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
    const sol = optimizeFull({
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

  it('falls back to triples when pairs are not enough', () => {
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
    const sol = optimizeFull({
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

  it('prunes an option dominated on cost alone', () => {
    const optExpensive = makeOpt(20, 10, [['B', 1]], [], Name.LUNAR_TOTEM);
    const optCheap = makeOpt(10, 10, [['B', 1]], [], Name.TUNGSTEN_ANKH); // same yield, half the fuel
    const sol = optimizeFull({
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

  it('values direct legendary drops when crafting is impossible', () => {
    // pCraft=0, so the only value is the 0.1 legendary drop rate. 10 launches
    // give lambda=1 and drop probability 1 - e^-1.
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]], 0)],
      ['B', makeNode('B', true)],
    ]);
    const optLeg = makeOpt(10, 10, [['B', 1]], [['A', 0.1]]);
    const sol = optimizeFull({
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

  it('pairs a zero-fuel option with a fueled one', () => {
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
    const sol = optimizeFull({
      options: [optZ, optP],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 200,
      baseYield: new Map(),
    });
    expect(sol.choiceHistory.find(c => c.targetAfxId === optZ.targetAfxId)).toBeDefined();
    expect(sol.choiceHistory.find(c => c.targetAfxId === optP.targetAfxId)).toBeDefined();
    expect(sol.finalYieldVector.get('B')).toBeCloseTo(10, 6);
    expect(sol.finalYieldVector.get('C')).toBeCloseTo(10, 6);
    expect(sol.timeUnitsUsed).toBe(200);
    expect(sol.fuelUsed).toBeCloseTo(100, 6);
  });

  it('keeps an option the dual filter would wrongly prune', () => {
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
    const sol = optimizeFull({
      options: [opt0, opt1, opt2],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 6,
      timeCapacity: 8,
      baseYield: new Map(),
    });
    expect(sol.expectedCrafts).toBeGreaterThan(4.5);
    expect(sol.choiceHistory.some(c => c.targetAfxId === opt2.targetAfxId)).toBe(true);
  });

  it('snapshots base_yield and keeps it out of the dropped column', () => {
    const root = 'puzzle-cube-2';
    const leaf = 'puzzle-cube-1';
    const dag: RecipeDAG = new Map([
      [root, makeNode(root, false, [[leaf, 1]], 0.1)],
      [leaf, makeNode(leaf, true)],
    ]);
    const sol = optimizeFull({
      options: [makeOpt(0, 10, [[leaf, 1]])],
      recipeDag: dag,
      desiredArtifactNodeIds: [root],
      fuelCapacity: 1_000_000,
      timeCapacity: 50,
      baseYield: new Map([[leaf, 5]]),
    });
    expect(sol.baseYield.get(leaf)).toBe(5);
    expect(sol.finalYieldVector.get(leaf)).toBeCloseTo(10, 9); // 5 owned + 5 dropped
    const leafRow = computeCraftChainRows(sol, root, null).find(r => r.nodeId === leaf);
    expect(leafRow).toBeDefined();
    expect(leafRow!.dropped).toBeCloseTo(5, 9);
  });

  it('never exceeds either budget', () => {
    const opts = [makeOpt(40, 5, [['B', 1]]), makeOpt(60, 8, [['B', 2]]), makeOpt(0, 3, [['B', 1]])];
    const sol = optimizeFull({
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

  it('treats a NaN or negative budget as zero (no launches)', () => {
    // An empty time budget field upstream turns into NaN; the search must
    // degrade to the deterministic no-launch baseline, not leak NaN into
    // the scans and the joint LP.
    const opts = [makeOpt(10, 10, [['B', 1]]), makeOpt(0, 3, [['B', 1]])];
    for (const timeCapacity of [NaN, -5, Infinity]) {
      const sol = optimizeFull({
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
    const solNaNFuel = optimizeFull({
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
