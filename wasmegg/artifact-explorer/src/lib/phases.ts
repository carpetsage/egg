// ============================================================
// Path of Virtue Optimizer — Phases 0, 1, 2
// ============================================================
//
// Phase 0 — Enumerate Launch Options (Spaceship × SensorTarget | null)
// Phase 1 — Precompute Yield Vectors
// Phase 2 — Discretize Time
//
// All functions are pure.
import { missions } from '@/lib/filter';
import {
  ei,
  getArtifactTierPropsFromId,
  getArtifactName,
  getMissionTypeFromId,
  ShipsConfig,
  type MissionType,
} from 'lib';

import type { DAGChildRef, DAGNode, LaunchOption, RecipeDAG } from './types';
import { getMissionLootData } from '@/lib';
import { sum } from '@/utils';
import { Ingredient } from 'lib/artifacts/data-json';

export function generateRecipeDag(id: string, recipeDag: RecipeDAG) {
  if (recipeDag.has(id)) return;

  const artifactData = getArtifactTierPropsFromId(id);

  const artifactIngredients = artifactData.recipe?.ingredients ?? [];

  const dagNode: DAGNode = {
    id: id,
    display_name: artifactData.name,
    is_leaf: !artifactData.craftable,
    is_root: false, // Set during other phases of computation
    required_quantity: 1,
    children: artifactIngredients.map((ingredient: Ingredient): DAGChildRef => {
      return {
        node_id: ingredient.id,
        quantity: ingredient.count,
      };
    }),
    legendaryCraftProbability: 0,
  };

  recipeDag.set(id, dagNode);

  for (const ingredient of artifactIngredients) {
    generateRecipeDag(ingredient.id, recipeDag);
  }
}

// ------------------------------------------------------------
// Phase 0 — Enumerate
// ------------------------------------------------------------

/**
 * Returns the Cartesian product of spaceships × (sensor_targets ∪ {null}).
 * Each pair is a distinct LaunchOption with time_units = 0 (set in Phase 2).
 */
export function enumerateLaunchOptions(playerConfig: ShipsConfig, dag: RecipeDAG): LaunchOption[] {
  const options: LaunchOption[] = [];

  for (const mission of missions) {
    if (!playerConfig.shipVisibility[mission.shipType]) continue;

    const missionData = getMissionLootData(mission.missionTypeId);
    const levelLootData = missionData.levels[playerConfig.shipLevels[mission.shipType]];
    const missionCapacity = getMissionTypeFromId(missionData.missionId).boostedCapacity(playerConfig);

    const applicableTargets = mission.isFTL
      ? levelLootData.targets
      : levelLootData.targets.filter(target => target.targetAfxId === ei.ArtifactSpec.Name.UNKNOWN);

    for (const target of applicableTargets) {
      const option = makeLaunchOption(mission, target.targetAfxId, playerConfig);
      for (const item of target.items) {
        const expectedDropsPerBatch = (sum(item.counts) / target.totalDrops) * missionCapacity * 3.0;
        option.supply_vector.set(item.itemId, expectedDropsPerBatch);

        if (dag.has(item.itemId)) {
          const legendaryRate = (item.counts[3] / target.totalDrops) * missionCapacity * 3.0;

          option.yield_vector.set(item.itemId, expectedDropsPerBatch);
          option.legendary_yield_vector.set(item.itemId, legendaryRate);
        }
      }

      options.push(option);
    }
  }

  return options;
}

function makeLaunchOption(mission: MissionType, target: ei.ArtifactSpec.Name, playerConfig: ShipsConfig): LaunchOption {
  const id = `${mission.missionTypeId}::${target}`;
  const fuelUse = mission.virtueFuels;

  const nonHumilityFuelUse = fuelUse.filter(x => x.egg !== ei.Egg.HUMILITY);

  return {
    id,
    ship: mission,
    target: getArtifactName(target),
    targetAfxId: target,
    actual_fuel: nonHumilityFuelUse.reduce((agg, current) => agg + current.amount, 0) * 3,
    actual_time: mission.boostedDurationSeconds(playerConfig),
    fuel_units: 0,
    fuel_by_egg: nonHumilityFuelUse.reduce((agg, current) => agg.set(current.egg, current.amount * 3), new Map()),
    time_units: 0, // filled by Phase 2
    num_ships_launched: 0,
    supply_vector: new Map(),
    yield_vector: new Map(),
    legendary_yield_vector: new Map(),
  };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Adds two yield vectors component-wise.
 * Returns a new Map; does not mutate either input.
 */
export function addYieldVectors(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const result = new Map(a);
  for (const [k, v] of b) {
    result.set(k, (result.get(k) ?? 0) + v);
  }
  return result;
}

/**
 * Returns an empty (all-zero) yield vector for the given DAG node set.
 */
export function zeroYieldVector(_: RecipeDAG): Map<string, number> {
  return new Map();
}
