// Recipe DAG construction and launch option enumeration for the optimizer.

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

// Recursively add `id` and everything in its crafting tree to `recipeDag`.
// Non-craftable artifacts become leaves with no children.
export function generateRecipeDag(id: string, recipeDag: RecipeDAG) {
  if (recipeDag.has(id)) return;

  const artifactData = getArtifactTierPropsFromId(id);

  const artifactIngredients = artifactData.recipe?.ingredients ?? [];

  const dagNode: DAGNode = {
    id,
    isLeaf: !artifactData.craftable,
    children: artifactIngredients.map(
      (ingredient: Ingredient): DAGChildRef => ({
        nodeId: ingredient.id,
        quantity: ingredient.count,
      })
    ),
    legendaryCraftProbability: 0, // buildRecipeDag fills this in for the root
  };

  recipeDag.set(id, dagNode);

  for (const ingredient of artifactIngredients) {
    generateRecipeDag(ingredient.id, recipeDag);
  }
}

// Enumerate launch options: every visible ship crossed with its applicable
// mission targets, each carrying fuel cost, duration, and per-launch yield
// vectors. Missions shorter than minDurationSeconds or whose ship costs more
// gems than maxGemCost (if given) are skipped.
export function enumerateLaunchOptions(
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  minDurationSeconds?: number,
  maxGemCost?: number
): LaunchOption[] {
  const options: LaunchOption[] = [];

  // Artifact families represented anywhere in the DAG. Targeting boosts a
  // whole family, so that's the granularity that matters here.
  const dagAfxIds = new Set<ei.ArtifactSpec.Name>();
  for (const nodeId of dag.keys()) {
    dagAfxIds.add(getArtifactTierPropsFromId(nodeId).afx_id);
  }

  for (const mission of missions) {
    if (!playerConfig.shipVisibility[mission.shipType]) continue;

    if (minDurationSeconds !== undefined) {
      const missionDuration = mission.boostedDurationSeconds(playerConfig);
      if (missionDuration < minDurationSeconds) continue;
    }

    if (maxGemCost !== undefined && mission.virtueGemCost > maxGemCost) continue;

    const missionData = getMissionLootData(mission.missionTypeId);
    const levelLootData = missionData.levels[playerConfig.shipLevels[mission.shipType]];
    const missionType = getMissionTypeFromId(missionData.missionId);
    const missionCapacity = missionType.boostedCapacity(playerConfig);
    const maxMissionCapacity = missionType.maxBoostedCapacity();

    const applicableTargets = mission.isFTL
      ? levelLootData.targets
      : levelLootData.targets.filter(target => target.targetAfxId === ei.ArtifactSpec.Name.UNKNOWN);

    // Keep every untargeted option and every option targeting a family in the
    // DAG. Targets outside the DAG are interchangeable for our purposes, so
    // keep just one representative: the one with the most recorded drops,
    // since its sampled rates are the most trustworthy.
    let bestNonDagTarget: (typeof applicableTargets)[number] | undefined;
    for (const target of applicableTargets) {
      if (target.targetAfxId === ei.ArtifactSpec.Name.UNKNOWN) continue;
      if (dagAfxIds.has(target.targetAfxId)) continue;
      if (bestNonDagTarget === undefined || target.totalDrops > bestNonDagTarget.totalDrops) {
        bestNonDagTarget = target;
      }
    }

    for (const target of applicableTargets) {
      const minTotalLaunches = target.totalDrops / maxMissionCapacity;

      // Cannot use the missionDataNotEnough function as it's too conservative
      // It uses the base launch capacity which yields too high of an expected launch count
      // Though, this effect will
      if (minTotalLaunches < 20 && !playerConfig.showNodata) continue;

      if (target.targetAfxId !== ei.ArtifactSpec.Name.UNKNOWN && !dagAfxIds.has(target.targetAfxId)) {
        if (target !== bestNonDagTarget) continue;
      }

      const option = makeLaunchOption(mission, target.targetAfxId, playerConfig);
      for (const item of target.items) {
        const expectedDropsPerBatch = (sum(item.counts) / target.totalDrops) * missionCapacity * 3.0;
        option.supplyVector.set(item.itemId, expectedDropsPerBatch);

        if (dag.has(item.itemId)) {
          // Zero out legendary counts below the observation minimum — a single
          // legendary across tens of thousands of drops gives a misleadingly
          // precise rate.
          const observed = item.counts[3];
          const legendaryCount = observed >= MIN_LEGENDARY_OBSERVATIONS || playerConfig.showNodata ? observed : 0;
          const legendaryRate = (legendaryCount / target.totalDrops) * missionCapacity * 3.0;

          option.yieldVector.set(item.itemId, expectedDropsPerBatch);
          option.legendaryYieldVector.set(item.itemId, legendaryRate);
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
    actualFuel: nonHumilityFuelUse.reduce((agg, current) => agg + current.amount, 0) * 3,
    actualTime: mission.boostedDurationSeconds(playerConfig),
    fuelByEgg: nonHumilityFuelUse.reduce((agg, current) => agg.set(current.egg, current.amount * 3), new Map()),
    supplyVector: new Map(),
    yieldVector: new Map(),
    legendaryYieldVector: new Map(),
  };
}
