// Pins for the display-row builders. DAGs and solutions are hand-built over
// the real lunar totem tier chain, since the builders resolve names and icons
// through getArtifactTierPropsFromId.

import { describe, expect, it } from 'vitest';
import { ei, getMissionTypeFromId, iconURL, Inventory } from 'lib';

import {
  computeCraftChainRows,
  computeInventoryRows,
  computeMissionLegendaryRows,
  lambdaFromDropProbability,
  legendaryCraftProbabilityOf,
} from './optimizer-views';
import { makeNode } from './spec-helpers';
import type { LaunchSolution, OptimizerSolution, RecipeDAG } from './types';

const Name = ei.ArtifactSpec.Name;
const Level = ei.ArtifactSpec.Level;
const Rarity = ei.ArtifactSpec.Rarity;

const lt1 = 'lunar-totem-1';
const lt2 = 'lunar-totem-2';
const lt3 = 'lunar-totem-3';
const lt4 = 'lunar-totem-4';

// lt4 needs 2x lt3 + 1x lt2; both intermediates share the lt1 leaf.
function totemDag(): RecipeDAG {
  return new Map([
    [
      lt4,
      makeNode(lt4, false, [
        [lt3, 2],
        [lt2, 1],
      ]),
    ],
    [lt3, makeNode(lt3, false, [[lt1, 3]])],
    [lt2, makeNode(lt2, false, [[lt1, 2]])],
    [lt1, makeNode(lt1, true)],
  ]);
}

// 4 common + 1 legendary T1 totems, 2 rare T2 totems.
function totemInventory(): Inventory {
  return new Inventory({
    inventoryItems: [
      { artifact: { spec: { name: Name.LUNAR_TOTEM, level: Level.INFERIOR, rarity: Rarity.COMMON } }, quantity: 4 },
      { artifact: { spec: { name: Name.LUNAR_TOTEM, level: Level.INFERIOR, rarity: Rarity.LEGENDARY } }, quantity: 1 },
      { artifact: { spec: { name: Name.LUNAR_TOTEM, level: Level.LESSER, rarity: Rarity.RARE } }, quantity: 2 },
    ],
  });
}

function makeSolution(overrides: Partial<OptimizerSolution>): OptimizerSolution {
  return {
    bestProbability: 0,
    craftProbability: 0,
    dropProbability: 0,
    expectedCrafts: 0,
    fuelUsed: 0,
    fuelByEgg: new Map(),
    timeUnitsUsed: 0,
    choiceHistory: [],
    expectedDrops: [],
    finalYieldVector: new Map(),
    baseYield: new Map(),
    recipeDag: new Map(),
    craftPrimal: new Map(),
    perTarget: [],
    ...overrides,
  };
}

describe('computeInventoryRows', () => {
  it('returns nothing without a player inventory', () => {
    expect(computeInventoryRows(lt4, totemDag(), null)).toEqual([]);
  });

  it('walks the DAG breadth-first, summing owned counts across rarities', () => {
    const rows = computeInventoryRows(lt4, totemDag(), totemInventory());
    expect(rows).toEqual([
      {
        nodeId: lt4,
        name: 'Eggceptional lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_4.png', 64),
        depth: 0,
        have: 0,
        needed: 1,
      },
      {
        nodeId: lt3,
        name: 'Powerful lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_3.png', 64),
        depth: 1,
        have: 0,
        needed: 2,
      },
      {
        nodeId: lt2,
        name: 'Lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_2.png', 64),
        depth: 1,
        have: 2,
        needed: 1,
      },
      // shared leaf appears once; `needed` comes from the first parent
      // reached (lt3's 3 per craft), not lt2's
      {
        nodeId: lt1,
        name: 'Basic lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_1.png', 64),
        depth: 2,
        have: 5,
        needed: 3,
      },
    ]);
  });

  it('skips child references that are missing from the DAG', () => {
    const dag: RecipeDAG = new Map([
      [
        lt2,
        makeNode(lt2, false, [
          [lt1, 2],
          ['puzzle-cube-1', 1],
        ]),
      ],
      [lt1, makeNode(lt1, true)],
    ]);
    const rows = computeInventoryRows(lt2, dag, totemInventory());
    expect(rows.map(r => r.nodeId)).toEqual([lt2, lt1]);
  });

  it('returns nothing when the root is not in the DAG', () => {
    expect(computeInventoryRows('puzzle-cube-1', totemDag(), totemInventory())).toEqual([]);
  });
});

describe('computeCraftChainRows', () => {
  it('returns nothing when the root is not in the DAG', () => {
    expect(computeCraftChainRows(makeSolution({}), lt4, null)).toEqual([]);
  });

  it('breaks down owned/dropped/crafted/consumed per node, excluding the root', () => {
    const solution = makeSolution({
      recipeDag: totemDag(),
      // 2 root crafts eat 4x lt3 + 2x lt2; 4 lt3 crafts eat 12x lt1
      craftPrimal: new Map([
        [lt4, 2],
        [lt3, 4],
      ]),
      finalYieldVector: new Map([
        [lt3, 10],
        [lt2, 1],
        [lt1, 12],
      ]),
      baseYield: new Map([
        [lt3, 3],
        [lt2, 5],
      ]),
    });
    const rows = computeCraftChainRows(solution, lt4, totemInventory());
    expect(rows).toEqual([
      {
        nodeId: lt3,
        name: 'Powerful lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_3.png', 64),
        depth: 1,
        qtyPerParentCraft: 2,
        owned: 0,
        dropped: 7,
        crafted: 4,
        consumed: 4,
      },
      // baseYield exceeds finalYield here; dropped clamps to 0
      {
        nodeId: lt2,
        name: 'Lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_2.png', 64),
        depth: 1,
        qtyPerParentCraft: 1,
        owned: 2,
        dropped: 0,
        crafted: 0,
        consumed: 2,
      },
      {
        nodeId: lt1,
        name: 'Basic lunar totem',
        iconUrl: iconURL('egginc/afx_lunar_totem_1.png', 64),
        depth: 2,
        qtyPerParentCraft: 3,
        owned: 5,
        dropped: 12,
        crafted: 0,
        consumed: 12,
      },
    ]);
  });

  it('reports owned as 0 without a player inventory', () => {
    const solution = makeSolution({ recipeDag: totemDag() });
    const rows = computeCraftChainRows(solution, lt4, null);
    expect(rows.map(r => r.owned)).toEqual([0, 0, 0]);
  });

  it('skips child references that are missing from the DAG', () => {
    const dag: RecipeDAG = new Map([
      [
        lt4,
        makeNode(lt4, false, [
          [lt3, 2],
          ['puzzle-cube-1', 1],
        ]),
      ],
      [lt3, makeNode(lt3, true)],
    ]);
    const rows = computeCraftChainRows(makeSolution({ recipeDag: dag }), lt4, null);
    expect(rows.map(r => r.nodeId)).toEqual([lt3]);
  });

  it('tolerates cycles between ingredients without looping', () => {
    const dag: RecipeDAG = new Map([
      [
        lt4,
        makeNode(lt4, false, [
          [lt3, 1],
          [lt2, 1],
        ]),
      ],
      [lt3, makeNode(lt3, false, [[lt2, 1]])],
      [lt2, makeNode(lt2, false, [[lt3, 1]])],
    ]);
    const rows = computeCraftChainRows(makeSolution({ recipeDag: dag }), lt4, null);
    expect(rows.map(r => r.nodeId)).toEqual([lt3, lt2]);
  });
});

describe('computeMissionLegendaryRows', () => {
  const ship = getMissionTypeFromId('henerprise-extended');

  function makeChoice(numShipsLaunched: number, legendary: [string, number][]): LaunchSolution {
    return {
      ship,
      actualFuel: 0,
      actualFuelByEgg: new Map(),
      actualTime: 0,
      target: '',
      targetAfxId: Name.LUNAR_TOTEM,
      numShipsLaunched,
      supplyVector: new Map(),
      legendarySupplyVector: new Map(legendary),
    };
  }

  it('scales per-batch legendary supply by batches of 3 ships', () => {
    const solution = makeSolution({
      choiceHistory: [
        makeChoice(6, [[lt4, 0.5]]), // 2 batches * 0.5 = 1 expected drop
        makeChoice(9, [[lt3, 0.5]]), // supplies a different node only
        makeChoice(3, [[lt4, 0.0001]]), // exactly at the noise threshold
      ],
    });
    const rows = computeMissionLegendaryRows(solution, lt4);
    expect(rows).toHaveLength(1);
    expect(rows[0].ship).toBe(ship);
    expect(rows[0].targetAfxId).toBe(Name.LUNAR_TOTEM);
    expect(rows[0].numShipsLaunched).toBe(6);
    expect(rows[0].legendaryDrops).toBeCloseTo(1, 12);
  });

  it('returns nothing for an empty history', () => {
    expect(computeMissionLegendaryRows(makeSolution({}), lt4)).toEqual([]);
  });
});

describe('lambdaFromDropProbability', () => {
  it('inverts P = 1 - e^-lambda', () => {
    expect(lambdaFromDropProbability(0.5)).toBeCloseTo(Math.LN2, 12);
    expect(lambdaFromDropProbability(1 - Math.exp(-2))).toBeCloseTo(2, 12);
  });

  it('returns 0 outside (0, 1)', () => {
    expect(lambdaFromDropProbability(0)).toBe(0);
    expect(lambdaFromDropProbability(1)).toBe(0);
    expect(lambdaFromDropProbability(-0.2)).toBe(0);
    expect(lambdaFromDropProbability(1.5)).toBe(0);
  });
});

describe('legendaryCraftProbabilityOf', () => {
  it('reads the root craft probability off the DAG, defaulting to 0', () => {
    const dag: RecipeDAG = new Map([[lt4, makeNode(lt4, false, [], 0.25)]]);
    expect(legendaryCraftProbabilityOf(makeSolution({ recipeDag: dag }), lt4)).toBe(0.25);
    expect(legendaryCraftProbabilityOf(makeSolution({ recipeDag: dag }), lt1)).toBe(0);
  });
});
