export * from './artifacts';
export * from './missions';
export * from './loot';
export * from './optimizer-views';

// ============================================================
// Path of Virtue Optimizer — Entry Point
// ============================================================
//
// Orchestrates Phases 0-4. Pure function; no side effects.

import type { DAGNode, LaunchSolution, OptimizerConfig, OptimizerSolution, DropRow, RecipeDAG } from './types';
import { enumerateLaunchOptions, generateRecipeDag } from './phases';
import { optimizeFull } from './optimizer-core';
import { ei, getArtifactTierPropsFromId, getCraftingLevelFromXp, Inventory, InventoryItem, ShipsConfig } from 'lib';

import { iconURL } from 'lib';

/**
 * Build the recipe DAG for the desired artifact(s) and the player's starting
 * "base yield" — the quantities they already own for each ingredient node.
 *
 * Each root's `legendaryCraftProbability` is derived from the player's crafting
 * XP and prior craft count, so legendary craft odds reflect their progress.
 * `baseYield` lets the optimizer treat owned items as a free head start.
 */
export function buildRecipeDag(
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

function computeExpectedDrops(solution: OptimizerSolution, dag: Map<string, DAGNode>): DropRow[] {
  const totals = new Map<string, number>();

  for (const choice of solution.choice_history) {
    for (const [item, rate] of choice.supply_vector) {
      totals.set(item, (totals.get(item) ?? 0) + rate * (choice.num_ships_launched / 3));
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

/**
 * Run the optimizer for a single desired artifact and decorate the result with
 * the presentation-only fields (sorted launches, expected drops, fuel by egg).
 *
 * Returns an array so the caller can render results with a single `v-for`; today
 * it always holds exactly one solution (one target per run).
 */
export function optimize(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  baseYield: Map<string, number>,
  minDurationSeconds?: number
) {
  const { desired_artifact_node_ids, fuel_tank_capacity, time_budget_seconds } = config;
  const options = enumerateLaunchOptions(playerConfig, dag, minDurationSeconds);

  const solutions: OptimizerSolution[] = [
    optimizeFull({
      options,
      recipe_dag: dag,
      desired_artifact_node_ids,
      fuel_capacity: fuel_tank_capacity,
      time_capacity: time_budget_seconds,
      base_yield: baseYield,
    }),
  ];

  for (const solution of solutions) {
    solution.choice_history.sort((a: LaunchSolution, b: LaunchSolution) => a.ship.shipType - b.ship.shipType);
    solution.expected_drops = computeExpectedDrops(solution, dag);
    solution.fuel_by_egg = computeFuelByEgg(solution);
  }

  return solutions;
}

// Re-export key types and utilities for consumers
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
