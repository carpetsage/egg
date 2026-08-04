import { describe, expect, it } from 'vitest';
import { ei, getMissionTypeFromId } from 'lib';

import { computeMissionLegendaryRows, lambdaFromDropProbability, legendaryCraftProbabilityOf } from './optimizer-views';
import { makeNode, makeSolution } from './spec-helpers';
import type { LaunchSolution, RecipeDAG } from './types';

const Name = ei.ArtifactSpec.Name;

const lt1 = 'lunar-totem-1';
const lt4 = 'lunar-totem-4';

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

  it('scales legendary supply by ship count', () => {
    const solution = makeSolution({
      choiceHistory: [
        makeChoice(2, [[lt4, 0.5]]), // 2 ships * 0.5 = 1 expected drop
        makeChoice(9, [[lt1, 0.5]]), // supplies a different node only
        makeChoice(3, [[lt4, 0.00001]]), // 3 * 1e-5 = 3e-5, below the noise threshold
      ],
    });
    const rows = computeMissionLegendaryRows(solution, lt4);
    expect(rows).toHaveLength(1);
    expect(rows[0].ship).toBe(ship);
    expect(rows[0].targetAfxId).toBe(Name.LUNAR_TOTEM);
    expect(rows[0].numShipsLaunched).toBe(2);
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
