export * from './artifacts';
export * from './missions';
export * from './loot';

// ============================================================
// Path of Virtue Optimizer — Entry Point
// ============================================================
//
// Orchestrates Phases 0-4. Pure function; no side effects.

import type { DAGNode, LaunchSolution, OptimizerConfig, OptimizerSolution, DropRow } from './types';
import { enumerateLaunchOptions, generateRecipeDag } from './phases';
import { ei, getArtifactTierPropsFromId, getCraftingLevelFromXp, Inventory, InventoryItem, ShipsConfig } from 'lib';

import { OptimizeFrankWolfe } from './frank-wolfe';
import { CancellationToken, OptimizeBruteForce } from './brute-force';
import { iconURL } from 'lib';

function buildRecipeDag(
  desired_artifact_node_ids: string[],
  playerInventory?: Inventory | null,
  playerTotalCraftingXp?: number | null,
  previousCraftsOverride?: number
): { dag: Map<string, DAGNode>; baseYield: Map<string, number> } {
  const recipe_dag = new Map<string, DAGNode>();
  const xp = playerTotalCraftingXp ?? 10_000_000_000;
  for (const artifact of desired_artifact_node_ids) {
    generateRecipeDag(artifact, recipe_dag);
    const artifactProps = getArtifactTierPropsFromId(artifact);
    const artifactItem = new InventoryItem(artifactProps.afx_id, artifactProps.afx_level);
    const artifactDagNode = recipe_dag.get(artifact)!;
    const previousCrafts =
      previousCraftsOverride !== undefined
        ? previousCraftsOverride
        : playerInventory
          ? playerInventory.getItem({ name: artifactProps.afx_id, level: artifactProps.afx_level }).crafted
          : 0;
    // craftChance returns a percentage value, not a raw probability
    artifactDagNode.legendaryCraftProbability =
      artifactItem.craftChance(
        getCraftingLevelFromXp(xp).rarityMult,
        ei.ArtifactSpec.Rarity.LEGENDARY,
        previousCrafts
      ) / 100.0;
  }

  // Build the base yield from the player's existing inventory for every DAG node.
  // This lets the optimizer treat owned items as a free starting point.
  const baseYield = new Map<string, number>();
  if (playerInventory) {
    const rootIds = new Set(desired_artifact_node_ids);
    for (const nodeId of recipe_dag.keys()) {
      if (rootIds.has(nodeId)) continue;
      const props = getArtifactTierPropsFromId(nodeId);
      const item = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
      const total = item.haveRarity[0] + item.haveRarity[1] + item.haveRarity[2] + item.haveRarity[3];
      if (total > 0) baseYield.set(nodeId, total);
    }
  }

  return { dag: recipe_dag, baseYield };
}

export function OptimizeBF(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  onImprovement: (solution: OptimizerSolution) => void,
  token: CancellationToken,
  playerInventory?: Inventory | null,
  playerTotalCraftingXp?: number | null,
  previousCraftsOverride?: number
): Promise<void> {
  const { desired_artifact_node_ids, fuel_tank_capacity, time_budget_seconds } = config;
  const { dag: recipe_dag, baseYield } = buildRecipeDag(
    desired_artifact_node_ids,
    playerInventory,
    playerTotalCraftingXp,
    previousCraftsOverride
  );
  const options = enumerateLaunchOptions(playerConfig, recipe_dag);
  return OptimizeBruteForce(
    {
      options,
      dag: recipe_dag,
      desiredArtifactNodeIds: desired_artifact_node_ids,
      fuelCapacity: fuel_tank_capacity,
      totalTimeUnits: time_budget_seconds,
      baseYield,
    },
    onImprovement,
    token
  );
}

function computeExpectedDrops(solution: OptimizerSolution, dag: Map<string, DAGNode>): DropRow[] {
  const totals = new Map<string, number>();

  for (const choice of solution.choice_history) {
    for (const [item, rate] of choice.supply_vector) {
      totals.set(item, (totals.get(item) ?? 0) + rate);
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

  for (const choice of solution.choice_history) {
    for (const [egg, rate] of choice.actual_fuel_by_egg) {
      totals.set(egg, (totals.get(egg) ?? 0) + (rate * choice.num_ships_launched) / 3.0);
    }
  }

  return totals;
}

export function OptimizeFrank(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  playerInventory?: Inventory | null,
  playerTotalCraftingXp?: number | null,
  previousCraftsOverride?: number
) {
  const { desired_artifact_node_ids, fuel_tank_capacity, time_budget_seconds } = config;
  const { dag: recipe_dag, baseYield } = buildRecipeDag(
    desired_artifact_node_ids,
    playerInventory,
    playerTotalCraftingXp,
    previousCraftsOverride
  );
  const options = enumerateLaunchOptions(playerConfig, recipe_dag);
  const rawResults = OptimizeFrankWolfe({
    options,
    dag: recipe_dag,
    desiredArtifactNodeIds: desired_artifact_node_ids,
    fuelCapacity: fuel_tank_capacity,
    totalTimeUnits: time_budget_seconds,
    maxIter: 1000,
    tol: 0.00001,
    baseYield,
  });

  for (const result of rawResults) {
    result.choice_history.sort(function (a: LaunchSolution, b: LaunchSolution) {
      if (a.from_fw === b.from_fw) {
        return a.ship.name < b.ship.name ? -1 : 1;
      } else if (a.from_fw) {
        return -1;
      } else {
        return 1;
      }
    });

    result.expected_drops = computeExpectedDrops(result, recipe_dag);

    result.fuel_by_egg = computeFuelByEgg(result);
  }

  return rawResults;
}

// Re-export key types and utilities for consumers
export type {
  OptimizerConfig,
  OptimizerSolution,
  LaunchOption,
  SensorTarget,
  DAGNode,
  DAGChildRef,
  RecipeDAG,
  DPCell,
  DPTable,
  SimulationConfig,
  SimulationResult,
} from './types';

export { poissonAtLeast as poissonAtLeast } from './objective';
export { enumerateLaunchOptions, addYieldVectors, zeroYieldVector, generateRecipeDag } from './phases';
