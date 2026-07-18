export * from './artifacts';
export * from './missions';
export * from './loot';
export * from './optimizer-views';

import type { DAGNode, LaunchSolution, OptimizerConfig, OptimizerSolution, DropRow, RecipeDAG } from './types';
import { enumerateLaunchOptions, generateRecipeDag } from './phases';
import { optimizeFull } from './optimizer-core';
import { ei, getArtifactTierPropsFromId, getCraftingInfoFromLevel, Inventory, InventoryItem, ShipsConfig } from 'lib';

import { iconURL } from 'lib';

// Build the recipe DAG for the desired artifacts, plus the player's starting
// quantities for each ingredient node. Each root's legendaryCraftProbability
// comes from the player's crafting XP and prior craft count.
export function buildRecipeDag(
  desiredArtifactNodeIds: string[],
  playerLevel: number,
  playerInventory?: Inventory | null,
  previousCraftsOverride?: number
): Map<string, DAGNode> {
  const recipeDag = new Map<string, DAGNode>();

  for (const artifact of desiredArtifactNodeIds) {
    generateRecipeDag(artifact, recipeDag);
    const artifactProps = getArtifactTierPropsFromId(artifact);
    const artifactItem = new InventoryItem(artifactProps.afx_id, artifactProps.afx_level);
    const artifactDagNode = recipeDag.get(artifact)!;
    const previousCrafts =
      previousCraftsOverride !== undefined
        ? previousCraftsOverride
        : playerInventory
          ? playerInventory.getItem({ name: artifactProps.afx_id, level: artifactProps.afx_level }).crafted
          : 0;

    // craftChance returns a percentage value, not a raw probability
    artifactDagNode.legendaryCraftProbability =
      artifactItem.craftChance(
        getCraftingInfoFromLevel(playerLevel).rarityMult,
        ei.ArtifactSpec.Rarity.LEGENDARY,
        previousCrafts
      ) / 100.0;
  }

  return recipeDag;
}

export function computeBaseYield(
  playerInventory: Inventory | null | undefined,
  desiredArtifactNodeIds: string[],
  recipeDag: Map<string, DAGNode>
) {
  const baseYield = new Map<string, number>();

  if (playerInventory) {
    const rootIds = new Set(desiredArtifactNodeIds);

    for (const nodeId of recipeDag.keys()) {
      if (rootIds.has(nodeId)) continue;
      const props = getArtifactTierPropsFromId(nodeId);
      const item = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
      const total = item.have;
      if (total > 0) baseYield.set(nodeId, total);
    }
  }

  return baseYield;
}

function computeExpectedDrops(solution: OptimizerSolution, dag: Map<string, DAGNode>): DropRow[] {
  const totals = new Map<string, number>();

  for (const choice of solution.choiceHistory) {
    for (const [item, rate] of choice.supplyVector) {
      totals.set(item, (totals.get(item) ?? 0) + (rate * choice.numShipsLaunched) / 3);
    }
  }

  const rows: DropRow[] = [];
  for (const [itemId, expected] of totals) {
    if (expected < 0.05) continue;
    const props = getArtifactTierPropsFromId(itemId);
    rows.push({
      itemId,
      name: props.name,
      iconUrl: iconURL('egginc/' + props.icon_filename, 64),
      expected,
      relevant: dag.has(itemId),
    });
  }
  rows.sort((a, b) => {
    if (a.relevant !== b.relevant) return a.relevant ? -1 : 1;
    return b.expected - a.expected;
  });
  return rows;
}

function computeFuelByEgg(solution: OptimizerSolution): Map<ei.Egg, number> {
  const totals = new Map();

  for (const choice of solution.choiceHistory) {
    for (const [egg, rate] of choice.actualFuelByEgg) {
      totals.set(egg, (totals.get(egg) ?? 0) + (rate * choice.numShipsLaunched) / 3.0);
    }
  }

  return totals;
}

// Run the optimizer and fill in the presentation-only fields. Returns an
// array though today it's always one solution. May extend this to return
// top N solutions.
export function optimize(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  baseYield: Map<string, number>,
  minDurationSeconds?: number,
  maxGemCost?: number
) {
  const { desiredArtifactNodeIds, fuelTankCapacity, timeBudgetSeconds } = config;
  const options = enumerateLaunchOptions(playerConfig, dag, minDurationSeconds, maxGemCost);

  const solutions: OptimizerSolution[] = [
    optimizeFull({
      options,
      recipeDag: dag,
      desiredArtifactNodeIds: desiredArtifactNodeIds,
      fuelCapacity: fuelTankCapacity,
      timeCapacity: timeBudgetSeconds,
      baseYield: baseYield,
    }),
  ];

  // Properties for presentation layer, easier to compute here
  for (const solution of solutions) {
    solution.choiceHistory.sort((a: LaunchSolution, b: LaunchSolution) => a.ship.shipType - b.ship.shipType);
    solution.expectedDrops = computeExpectedDrops(solution, dag);
    solution.fuelByEgg = computeFuelByEgg(solution);
  }

  return solutions;
}

export type {
  OptimizerConfig,
  OptimizerSolution,
  LaunchOption,
  LaunchSolution,
  DropRow,
  DAGNode,
  DAGChildRef,
  RecipeDAG,
} from './types';
