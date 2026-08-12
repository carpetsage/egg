// The pipeline must not depend on the order targets were selected in, with a
// save loaded: each target's legendary craft probability comes from its own
// crafted count, not from whichever target happened to be first.

import { describe, it, expect } from 'vitest';
import { ei, Inventory, perfectShipsConfig } from 'lib';
import { buildRecipeDag, computeBaseYield, optimize, type OptimizerSolution } from '@/lib';

const Name = ei.ArtifactSpec.Name;
const Level = ei.ArtifactSpec.Level;

const FEATHER = 'phoenix-feather-4';
const CHALICE = 'the-chalice-4';

// A save with very different craft histories for the two targets.
function savedInventory(): Inventory {
  return new Inventory({
    artifactStatus: [
      { spec: { name: Name.PHOENIX_FEATHER, level: Level.GREATER }, count: 20 },
      { spec: { name: Name.THE_CHALICE, level: Level.GREATER }, count: 0 },
    ],
  });
}

function craftProbabilities(ids: string[], previousCraftsOverride?: number): Map<string, number> {
  const dag = buildRecipeDag(ids, 30, savedInventory(), previousCraftsOverride);
  return new Map(ids.map(id => [id, dag.get(id)!.legendaryCraftProbability]));
}

describe('buildRecipeDag with a save loaded', () => {
  it('gives each target its own crafted count', () => {
    const p = craftProbabilities([FEATHER, CHALICE]);
    expect(p.get(FEATHER)!).toBeGreaterThan(p.get(CHALICE)!);
  });

  it('is unaffected by the order the targets were selected in', () => {
    const forward = craftProbabilities([FEATHER, CHALICE]);
    const reversed = craftProbabilities([CHALICE, FEATHER]);
    expect(reversed.get(FEATHER)).toBe(forward.get(FEATHER));
    expect(reversed.get(CHALICE)).toBe(forward.get(CHALICE));
  });

  it('applies a manual override to every target', () => {
    const p = craftProbabilities([FEATHER, CHALICE], 20);
    expect(p.get(CHALICE)).toBe(p.get(FEATHER));
    expect(p.get(FEATHER)).toBe(craftProbabilities([FEATHER, CHALICE]).get(FEATHER));
  });
});

function summarize(sol: OptimizerSolution) {
  // The top-level probability fields deliberately mirror perTarget[0], so they
  // are order-dependent by design and left out here.
  return {
    jointProbability: sol.jointProbability,
    fuelUsed: sol.fuelUsed,
    timeUnitsUsed: sol.timeUnitsUsed,
    perTarget: [...sol.perTarget]
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
      .map(t => ({
        nodeId: t.nodeId,
        bestProbability: t.bestProbability,
        craftProbability: t.craftProbability,
        dropProbability: t.dropProbability,
      })),
    choices: [...sol.choiceHistory]
      .map(c => `${c.ship.shipType}/${c.ship.durationType}/${c.target}/${c.numShipsLaunched}`)
      .sort(),
  };
}

async function runPipeline(ids: string[]): Promise<OptimizerSolution> {
  const inventory = savedInventory();
  const config = {
    desiredArtifactNodeIds: ids,
    includeNotEnoughData: false,
    fuelTankCapacity: 2_000_000_000,
    timeBudgetSeconds: 24 * 3600,
  };
  const dag = buildRecipeDag(ids, 30, inventory);
  const baseYield = computeBaseYield(inventory, ids, dag);
  return (await optimize(config, perfectShipsConfig, dag, baseYield))[0];
}

describe('full pipeline target order', () => {
  it('produces the same plan whichever order the targets were selected in', async () => {
    expect(summarize(await runPipeline([CHALICE, FEATHER]))).toEqual(summarize(await runPipeline([FEATHER, CHALICE])));
  });
});
