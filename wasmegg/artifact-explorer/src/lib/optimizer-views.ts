// ============================================================
// Path of Virtue Optimizer — Presenter Row Builders
// ============================================================
//
// Derives display-ready row arrays from an OptimizerSolution.
// These helpers do calculator-adjacent work (per-node consumption
// roll-ups, Poisson rate inversion, per-launch legendary drop
// expectations) and resolve artifact metadata for icons / names.
// They never mutate the solution.

import type { ei, Inventory, MissionType } from 'lib';
import { getArtifactTierPropsFromId, iconURL } from 'lib';
import type { DAGNode, OptimizerSolution } from './types';

export interface InventoryRow {
  nodeId: string;
  name: string;
  iconUrl: string;
  depth: number;
  have: number;
  needed: number;
}

/**
 * BFS over the recipe DAG rooted at the targeted artifact, collecting the
 * player's owned counts (across all rarities) for each ingredient. Used by
 * the inventory panel to show "what do I already have?" at a glance.
 */
export function computeInventoryRows(
  rootId: string,
  recipeDag: Map<string, DAGNode>,
  playerInventory: Inventory | null
): InventoryRow[] {
  if (!playerInventory) return [];

  const rows: InventoryRow[] = [];
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number; needed: number }[] = [{ nodeId: rootId, depth: 0, needed: 1 }];

  while (queue.length > 0) {
    const { nodeId, depth, needed } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = recipeDag.get(nodeId);
    if (!node) continue;

    const props = getArtifactTierPropsFromId(nodeId);
    const item = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
    const have = item.haveRarity[0] + item.haveRarity[1] + item.haveRarity[2] + item.haveRarity[3];

    rows.push({
      nodeId,
      name: props.name,
      iconUrl: iconURL('egginc/' + props.icon_filename, 64),
      depth,
      have,
      needed,
    });

    for (const child of node.children) {
      queue.push({ nodeId: child.node_id, depth: depth + 1, needed: child.quantity });
    }
  }

  return rows;
}

export interface CraftChainRow {
  nodeId: string;
  name: string;
  iconUrl: string;
  depth: number;
  qtyPerParentCraft: number;
  owned: number;
  dropped: number;
  crafted: number;
  consumed: number;
}

export interface MissionLegendaryRow {
  ship: MissionType;
  targetAfxId: ei.ArtifactSpec.Name;
  num_ships_launched: number;
  legendaryDrops: number;
}

/**
 * Recover the Poisson rate λ from the solution's total drop probability:
 *   P(drop) = 1 − e^(−λ)  ⇒  λ = −ln(1 − P).
 * Falls back to 0 outside (0, 1) where the inverse is undefined.
 */
export function lambdaFromDropProbability(p: number): number {
  return p > 0 && p < 1 ? -Math.log(1 - p) : 0;
}

/**
 * Build the craft-chain breakdown rows for the targeted artifact.
 *
 * For every non-root DAG node `B`, `consumed[B] = Σ_parents A craft_primal[A] · qty(B per A craft)`,
 * which is the LP-implied number of `B` consumed by recipes the optimizer
 * chose to run. Combined with the per-node owned / dropped / crafted
 * quantities this yields the rows shown in the probability breakdown.
 */
export function computeCraftChainRows(
  solution: OptimizerSolution,
  rootId: string,
  playerInventory: Inventory | null
): CraftChainRow[] {
  const dag = solution.recipe_dag;
  const rootNode = dag.get(rootId);
  if (!rootNode) return [];

  const consumed = new Map<string, number>();
  for (const [nodeId, node] of dag) {
    if (node.is_leaf) continue;
    const crafted = solution.craft_primal.get(nodeId) ?? 0;
    if (crafted <= 0) continue;
    for (const child of node.children) {
      consumed.set(child.node_id, (consumed.get(child.node_id) ?? 0) + crafted * child.quantity);
    }
  }

  const rows: CraftChainRow[] = [];
  const visited = new Set<string>([rootId]);
  const queue: { nodeId: string; depth: number; qty: number }[] = rootNode.children.map(c => ({
    nodeId: c.node_id,
    depth: 1,
    qty: c.quantity,
  }));

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.nodeId)) continue;
    visited.add(item.nodeId);
    const node = dag.get(item.nodeId);
    if (!node) continue;
    const props = getArtifactTierPropsFromId(item.nodeId);
    let ownedCount = 0;
    if (playerInventory) {
      const it = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
      ownedCount = it.haveRarity[0] + it.haveRarity[1] + it.haveRarity[2] + it.haveRarity[3];
    }
    rows.push({
      nodeId: item.nodeId,
      name: props.name,
      iconUrl: iconURL('egginc/' + props.icon_filename, 64),
      depth: item.depth,
      qtyPerParentCraft: item.qty,
      owned: ownedCount,
      dropped: solution.final_yield_vector.get(item.nodeId) ?? 0,
      crafted: solution.craft_primal.get(item.nodeId) ?? 0,
      consumed: consumed.get(item.nodeId) ?? 0,
    });
    for (const child of node.children) {
      if (!visited.has(child.node_id)) {
        queue.push({ nodeId: child.node_id, depth: item.depth + 1, qty: child.quantity });
      }
    }
  }

  return rows;
}

/**
 * Per-mission expected direct-legendary drops for the targeted root:
 * `legendary_supply_vector[root]` is per-launch-batch (= 3 ships), so
 * scale by `num_ships_launched / 3` to convert to the chosen multiplicity.
 * Tiny contributions (< 1e-4) are filtered out so the breakdown only
 * shows the missions that actually move the needle on λ.
 */
export function computeMissionLegendaryRows(solution: OptimizerSolution, rootId: string): MissionLegendaryRow[] {
  return solution.choice_history
    .map(choice => ({
      ship: choice.ship,
      targetAfxId: choice.targetAfxId,
      num_ships_launched: choice.num_ships_launched,
      legendaryDrops: (choice.num_ships_launched / 3) * (choice.legendary_supply_vector.get(rootId) ?? 0),
    }))
    .filter(row => row.legendaryDrops > 0.0001);
}

/**
 * Return the per-craft legendary probability for the targeted artifact,
 * looked up directly off the solution's recipe DAG. Defaults to 0 when
 * the artifact is missing from the DAG (degenerate input).
 */
export function legendaryCraftProbabilityOf(solution: OptimizerSolution, rootId: string): number {
  return solution.recipe_dag.get(rootId)?.legendaryCraftProbability ?? 0;
}
