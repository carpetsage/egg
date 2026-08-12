// The golden egg cap, from the outside.
//
// The cap is one linear row and it is written into three models, but only one
// thing about that is a promise to the player: the bill the card prints has to
// honour the number they typed. So this file states the cap the way the UI does
// — a capacity handed to `optimize` — and checks the plan that comes back,
// rather than checking that each model carries the row. Which model holds it is
// the formulation's business and moves when the formulation moves.

import { describe, expect, it } from 'vitest';
import { ei, getArtifactTierPropsFromId, Inventory, multiCraftCost, perfectShipsConfig, singleCraftCost } from 'lib';

import { buildRecipeDag, computeBaseYield, computePlanCraftingCost, computeCraftUnitPrices, optimize } from '@/lib';

const Name = ei.ArtifactSpec.Name;
const Level = ei.ArtifactSpec.Level;

describe('computeCraftUnitPrices', () => {
  const cubes = buildRecipeDag(['puzzle-cube-4'], 30);

  it('prices every craftable at the player next craft and skips the leaves', () => {
    const prices = computeCraftUnitPrices(cubes, null);
    for (const [nodeId, node] of cubes) {
      const params = getArtifactTierPropsFromId(nodeId).recipe?.crafting_price;
      if (node.isLeaf || !params) {
        expect(prices.has(nodeId)).toBe(false);
      } else {
        expect(prices.get(nodeId)).toBe(singleCraftCost(params, 0));
      }
    }
  });

  it('reads the crafted count out of the inventory, so a veteran is priced lower', () => {
    // artifactStatus.count is what Inventory reads as `crafted`; puzzle-cube-2
    // is the LESSER tier of the family.
    const inventory = new Inventory({
      artifactStatus: [
        {
          spec: { name: Name.PUZZLE_CUBE, level: Level.LESSER },
          count: 40,
          discovered: true,
          recipeDiscovered: true,
        },
      ],
    });
    const params = getArtifactTierPropsFromId('puzzle-cube-2').recipe!.crafting_price;
    const veteran = computeCraftUnitPrices(cubes, inventory);
    expect(veteran.get('puzzle-cube-2')).toBe(singleCraftCost(params, 40));
    expect(veteran.get('puzzle-cube-2')!).toBeLessThan(computeCraftUnitPrices(cubes, null).get('puzzle-cube-2')!);
  });

  it('never under-states the bill: the linear price dominates the real curve', () => {
    const unit = computeCraftUnitPrices(cubes, null);
    const params = getArtifactTierPropsFromId('puzzle-cube-3').recipe!.crafting_price;
    for (const crafts of [1, 2, 5, 20, 100]) {
      expect(unit.get('puzzle-cube-3')! * crafts).toBeGreaterThanOrEqual(multiCraftCost(params, 0, crafts));
    }
  });
});

describe('optimize', () => {
  const config = {
    desiredArtifactNodeIds: ['puzzle-cube-4'],
    includeNotEnoughData: false,
    fuelTankCapacity: 2_000_000_000,
    timeBudgetSeconds: 3 * 24 * 3600,
  };
  const cubes = buildRecipeDag(config.desiredArtifactNodeIds, 30);
  const baseYield = computeBaseYield(null, config.desiredArtifactNodeIds, cubes);
  const unitPrices = computeCraftUnitPrices(cubes, null);

  it('brings the priced plan under a cap that the uncapped plan blows', async () => {
    const [uncapped] = await optimize(config, perfectShipsConfig, cubes, baseYield);
    const uncappedCost = computePlanCraftingCost(uncapped, null).total;
    expect(uncappedCost).toBeGreaterThan(0);

    const capacity = uncappedCost / 4;
    const [capped] = await optimize(config, perfectShipsConfig, cubes, baseYield, 0, undefined, {
      capacity,
      unitPrices,
    });

    // The card reports the same linear price the budget row is written in, so
    // the reported bill honours the cap the player set — the property that makes
    // the cap mean anything. It can land *on* the cap rather than under it, and
    // the two sides reach the same number by different summations through
    // HiGHS, so the comparison carries a relative epsilon rather than being
    // exact.
    expect(computePlanCraftingCost(capped, null).total).toBeLessThanOrEqual(capacity * (1 + 1e-9));
    expect(capped.bestProbability).toBeLessThanOrEqual(uncapped.bestProbability + 1e-9);
  }, 60_000);
});
