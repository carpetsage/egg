// ============================================================
// Path of Virtue Optimizer — Recipe DAG + Launch Option Enumeration
// ============================================================
//
// generateRecipeDag      — build the crafting DAG for a target artifact.
// enumerateLaunchOptions — enumerate every (spaceship × mission target) launch
//                          option, precomputing its fuel cost, duration, and
//                          per-launch yield vectors.
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
import { getMissionLootData, MIN_LEGENDARY_OBSERVATIONS } from '@/lib';
import { sum } from '@/utils';
import { Ingredient } from 'lib/artifacts/data-json';

/**
 * Recursively populate `recipeDag` with `id` and every artifact in its crafting
 * tree (a no-op for ids already present). Mutates `recipeDag` in place; leaf
 * (non-craftable) artifacts get an empty `children` list.
 */
export function generateRecipeDag(id: string, recipeDag: RecipeDAG) {
  if (recipeDag.has(id)) return;

  const artifactData = getArtifactTierPropsFromId(id);

  const artifactIngredients = artifactData.recipe?.ingredients ?? [];

  const dagNode: DAGNode = {
    id,
    is_leaf: !artifactData.craftable,
    children: artifactIngredients.map(
      (ingredient: Ingredient): DAGChildRef => ({
        node_id: ingredient.id,
        quantity: ingredient.count,
      })
    ),
    legendaryCraftProbability: 0, // set for the targeted root by buildRecipeDag()
  };

  recipeDag.set(id, dagNode);

  for (const ingredient of artifactIngredients) {
    generateRecipeDag(ingredient.id, recipeDag);
  }
}

// ------------------------------------------------------------
// Launch option enumeration
// ------------------------------------------------------------

/**
 * Enumerate every launch option: the Cartesian product of the player's visible
 * spaceships and their applicable mission targets. Each option carries its fuel
 * cost, duration, and per-launch yield / legendary vectors.
 * @param minDurationSeconds optional floor on mission duration in seconds; shorter missions are excluded
 */
export function enumerateLaunchOptions(
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  minDurationSeconds?: number
): LaunchOption[] {
  const options: LaunchOption[] = [];

  for (const mission of missions) {
    if (!playerConfig.shipVisibility[mission.shipType]) continue;

    if (minDurationSeconds !== undefined) {
      const missionDuration = mission.boostedDurationSeconds(playerConfig);
      if (missionDuration < minDurationSeconds) continue;
    }

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
          // Sparse-data gate: a single legendary observation across tens of
          // thousands of drops yields a misleadingly precise rate. Trust this
          // bucket's legendary count only if it has reached the minimum, OR if
          // no bucket of this item has reached it (in which case zeroing every
          // bucket would discard all signal).
          const observed = item.counts[3];
          const legendaryCount = observed >= MIN_LEGENDARY_OBSERVATIONS || playerConfig.showNodata ? observed : 0;
          const legendaryRate = (legendaryCount / target.totalDrops) * missionCapacity * 3.0;

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
    fuel_by_egg: nonHumilityFuelUse.reduce((agg, current) => agg.set(current.egg, current.amount * 3), new Map()),
    supply_vector: new Map(),
    yield_vector: new Map(),
    legendary_yield_vector: new Map(),
  };
}
