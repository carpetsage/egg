// End-to-end coverage of the production pipeline on real game data: recipe
// DAG construction, launch option enumeration, and a full optimize() run.
// Assertions stick to structure and invariants so loot data refreshes don't
// break them; the one exact-recipe check (puzzle cube) is stable game design.

import { describe, it, expect } from 'vitest';
import { ei, perfectShipsConfig } from 'lib';
import { buildRecipeDag, computeBaseYield, optimize } from '@/lib';
import { enumerateLaunchOptions } from './phases';

const Name = ei.ArtifactSpec.Name;

describe('buildRecipeDag', () => {
  it('builds the real puzzle cube recipe chain', () => {
    const dag = buildRecipeDag(['puzzle-cube-4'], 30);

    for (const tier of ['puzzle-cube-1', 'puzzle-cube-2', 'puzzle-cube-3', 'puzzle-cube-4']) {
      expect(dag.has(tier)).toBe(true);
    }
    expect(dag.get('puzzle-cube-4')!.isLeaf).toBe(false);
    expect(dag.get('puzzle-cube-1')!.isLeaf).toBe(true);
    expect(dag.get('puzzle-cube-1')!.children).toEqual([]);
    expect(dag.get('puzzle-cube-2')!.children).toEqual([{ nodeId: 'puzzle-cube-1', quantity: 3 }]);

    // every child reference resolves within the DAG
    for (const node of dag.values()) {
      for (const child of node.children) {
        expect(dag.has(child.nodeId)).toBe(true);
        expect(child.quantity).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('puts the legendary craft probability on the root only', () => {
    const dag = buildRecipeDag(['puzzle-cube-4'], 30);
    const root = dag.get('puzzle-cube-4')!;
    expect(root.legendaryCraftProbability).toBeGreaterThan(0);
    expect(root.legendaryCraftProbability).toBeLessThanOrEqual(1);
    for (const node of dag.values()) {
      if (node.id === root.id) continue;
      expect(node.legendaryCraftProbability).toBe(0);
    }
  });
});

describe('enumerateLaunchOptions', () => {
  const dag = buildRecipeDag(['puzzle-cube-4'], 30);

  it('produces well-formed options from real loot data', () => {
    const options = enumerateLaunchOptions(perfectShipsConfig, dag);
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(o.actualTime).toBeGreaterThan(0);
      expect(o.actualFuel).toBeGreaterThanOrEqual(0);
      for (const itemId of o.yieldVector.keys()) {
        expect(dag.has(itemId)).toBe(true);
      }
      for (const itemId of o.legendaryYieldVector.keys()) {
        expect(dag.has(itemId)).toBe(true);
      }
    }
    expect(options.some(o => o.targetAfxId === Name.UNKNOWN)).toBe(true);
    expect(options.some(o => o.targetAfxId === Name.PUZZLE_CUBE)).toBe(true);
  });

  it('drops missions shorter than minDurationSeconds', () => {
    const all = enumerateLaunchOptions(perfectShipsConfig, dag);
    const minDuration = 4 * 3600;
    const longOnly = enumerateLaunchOptions(perfectShipsConfig, dag, minDuration);
    expect(longOnly.length).toBeGreaterThan(0);
    expect(longOnly.length).toBeLessThan(all.length);
    for (const o of longOnly) {
      expect(o.actualTime).toBeGreaterThanOrEqual(minDuration);
    }
  });
});

describe('optimize', () => {
  it('runs the full pipeline within budgets', () => {
    const config = {
      desiredArtifactNodeIds: ['puzzle-cube-4'],
      includeNotEnoughData: false,
      fuelTankCapacity: 2_000_000_000,
      timeBudgetSeconds: 3 * 24 * 3600,
    };
    const dag = buildRecipeDag(config.desiredArtifactNodeIds, 30);
    const baseYield = computeBaseYield(null, config.desiredArtifactNodeIds, dag);
    const [sol] = optimize(config, perfectShipsConfig, dag, baseYield);

    expect(sol.fuelUsed).toBeLessThanOrEqual(config.fuelTankCapacity + 1e-6);
    expect(sol.timeUnitsUsed).toBeLessThanOrEqual(config.timeBudgetSeconds + 1);
    expect(sol.bestProbability).toBeGreaterThan(0);
    expect(sol.bestProbability).toBeLessThanOrEqual(1);
    expect(sol.perTarget[0].bestProbability).toBeCloseTo(sol.bestProbability, 12);
    expect(sol.choiceHistory.length).toBeGreaterThan(0);

    // presentation pass: sorted by ship, drop rows filled in
    for (let i = 1; i < sol.choiceHistory.length; i++) {
      expect(sol.choiceHistory[i - 1].ship.shipType).toBeLessThanOrEqual(sol.choiceHistory[i].ship.shipType);
    }
    expect(sol.expectedDrops.length).toBeGreaterThan(0);
    for (const row of sol.expectedDrops) {
      expect(row.expected).toBeGreaterThan(0);
      expect(row.iconUrl).toMatch(/^https:/);
    }
  });
});
