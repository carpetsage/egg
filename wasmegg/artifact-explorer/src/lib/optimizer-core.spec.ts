// What `optimizeFull` owes its caller, rather than what the search does inside.
//
// The plan's shape — which options it picks, how it splits a budget between
// them, whether it beats a hand-computed optimum on a three-option fixture — is
// the arena's subject, over 40 production instances and against invariants that
// hold without a reference answer. C1 checks feasibility, D1/D2 check that no
// small edit improves the returned plan, A1/A2 check that relaxing a budget
// cannot hurt. Restating any of that here as an expected allocation pins one
// formulation's output and has to be rewritten whenever the formulation moves.
//
// What is left is the part the arena never generates: inputs that come from the
// UI rather than from a solver, and reported numbers a user reads.

import { describe, it, expect } from 'vitest';
import { ei } from 'lib';
import { optimizeFull } from './optimizer-core';
import { computeCraftChainTree } from './optimizer-tree';
import { craftDag, makeNode, makeOpt } from './spec-helpers';
import type { RecipeDAG } from './types';

const Name = ei.ArtifactSpec.Name;

describe('optimizeFull', () => {
  it('handles an empty option list', async () => {
    const sol = await optimizeFull({
      options: [],
      recipeDag: craftDag(),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1000,
      timeCapacity: 100,
      baseYield: new Map(),
      maximumCost: Infinity,
    });
    expect(sol.bestProbability).toBeCloseTo(0, 9);
    expect(sol.choiceHistory).toHaveLength(0);
    expect(sol.fuelUsed).toBeCloseTo(0, 9);
  });

  // The gem cap used to prune the menu inside enumerateLaunchOptions; it now
  // rides on the option as `cost` and is applied here, where the budgets are.
  // It is a UI setting rather than a solver parameter — the arena never states a
  // problem with one — and a cap that failed to bind tells the player to fly a
  // ship they cannot afford.
  it('drops an option whose ship costs more gems than maximumCost', async () => {
    // The dear ship is the better mission — half the fuel for the same yield —
    // so a cap that failed to bind would show up as it being launched.
    const optDear = { ...makeOpt(5, 10, [['B', 1]], [], Name.LUNAR_TOTEM), cost: 130e24 };
    const optAffordable = { ...makeOpt(10, 10, [['B', 1]], [], Name.TUNGSTEN_ANKH), cost: 129e24 };
    const args = {
      options: [optDear, optAffordable],
      recipeDag: craftDag(0.1),
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 100,
      timeCapacity: 100,
      baseYield: new Map<string, number>(),
    };

    const capped = await optimizeFull({ ...args, maximumCost: 129e24 });
    expect(capped.choiceHistory.find(c => c.targetAfxId === optDear.targetAfxId)).toBeUndefined();
    // inclusive: a ship priced exactly at the cap is affordable
    expect(capped.choiceHistory.find(c => c.targetAfxId === optAffordable.targetAfxId)).toBeDefined();

    // An absent cap is no cap, not a cap of zero.
    const uncapped = await optimizeFull({ ...args, maximumCost: undefined });
    expect(uncapped.choiceHistory.find(c => c.targetAfxId === optDear.targetAfxId)).toBeDefined();
  });

  it('values direct legendary drops when crafting is impossible', async () => {
    // pCraft=0, so the only value is the 0.1 legendary drop rate. 10 launches
    // give lambda=1 and drop probability 1 - e^-1. Checked against the closed
    // form, not against another code path.
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
      maximumCost: Infinity,
    });
    expect(sol.craftProbability).toBeCloseTo(0, 9);
    expect(sol.dropProbability).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(sol.bestProbability).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it('snapshots base_yield and keeps it out of the dropped column', async () => {
    // The craft-chain card shows owned and dropped as separate columns; stock
    // the player already had must not be reported as something a mission found.
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
      maximumCost: Infinity,
    });
    expect(sol.baseYield.get(leaf)).toBe(5);
    // 10s per launch, 50s per-slot horizon, 3 slots: 5 per slot -> 15 dropped
    expect(sol.finalYieldVector.get(leaf)).toBeCloseTo(20, 9); // 5 owned + 15 dropped
    const leafNode = computeCraftChainTree(sol, root, null)?.children.find(n => n.nodeId === leaf);
    expect(leafNode).toBeDefined();
    expect(leafNode!.metrics.dropped).toBeCloseTo(15, 9);
  });

  it('treats a NaN or negative budget as zero (no launches)', async () => {
    // An empty input field upstream arrives as NaN; degrade to the no-launch
    // baseline rather than leak it into the solve. The arena only ever states
    // well-formed budgets, so this path is reachable from the UI and nowhere
    // else.
    const opts = [makeOpt(10, 10, [['B', 1]]), makeOpt(0, 3, [['B', 1]])];
    for (const timeCapacity of [NaN, -5, Infinity]) {
      const sol = await optimizeFull({
        options: opts,
        recipeDag: craftDag(0.1),
        desiredArtifactNodeIds: ['A'],
        fuelCapacity: 1000,
        timeCapacity,
        baseYield: new Map(),
        maximumCost: Infinity,
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
      maximumCost: Infinity,
    });
    // the zero-fuel option is still launchable against the time budget
    expect(solNaNFuel.fuelUsed).toBe(0);
    expect(solNaNFuel.timeUnitsUsed).toBeLessThanOrEqual(100);
  });
});
