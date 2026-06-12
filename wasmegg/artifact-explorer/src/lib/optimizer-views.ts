// Display-ready row builders derived from an OptimizerSolution.

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

// Walk the recipe DAG from the targeted artifact, collecting the player's
// owned counts (all rarities) for each ingredient. Feeds the inventory panel.
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
      queue.push({ nodeId: child.nodeId, depth: depth + 1, needed: child.quantity });
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
  numShipsLaunched: number;
  legendaryDrops: number;
}

// Invert P(drop) = 1 - e^(-lambda); 0 outside (0, 1).
export function lambdaFromDropProbability(p: number): number {
  return p > 0 && p < 1 ? -Math.log(1 - p) : 0;
}

// Craft-chain breakdown rows for the probability display. consumed[B] is the
// LP-implied number of B eaten by the recipes the optimizer chose to run,
// shown alongside the per-node owned / dropped / crafted quantities.
export function computeCraftChainRows(
  solution: OptimizerSolution,
  rootId: string,
  playerInventory: Inventory | null
): CraftChainRow[] {
  const dag = solution.recipeDag;
  const rootNode = dag.get(rootId);
  if (!rootNode) return [];

  const consumed = new Map<string, number>();
  for (const [nodeId, node] of dag) {
    if (node.isLeaf) continue;
    const crafted = solution.craftPrimal.get(nodeId) ?? 0;
    if (crafted <= 0) continue;
    for (const child of node.children) {
      consumed.set(child.nodeId, (consumed.get(child.nodeId) ?? 0) + crafted * child.quantity);
    }
  }

  const rows: CraftChainRow[] = [];
  const visited = new Set<string>([rootId]);
  const queue: { nodeId: string; depth: number; qty: number }[] = rootNode.children.map(c => ({
    nodeId: c.nodeId,
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
      dropped: Math.max(
        0,
        (solution.finalYieldVector.get(item.nodeId) ?? 0) - (solution.baseYield.get(item.nodeId) ?? 0)
      ),
      crafted: solution.craftPrimal.get(item.nodeId) ?? 0,
      consumed: consumed.get(item.nodeId) ?? 0,
    });
    for (const child of node.children) {
      if (!visited.has(child.nodeId)) {
        queue.push({ nodeId: child.nodeId, depth: item.depth + 1, qty: child.quantity });
      }
    }
  }

  return rows;
}

// Per-mission expected direct legendary drops of the targeted root.
// legendary_supply_vector is per batch of 3 ships, hence the /3. Missions
// contributing essentially nothing are dropped from the breakdown.
export function computeMissionLegendaryRows(solution: OptimizerSolution, rootId: string): MissionLegendaryRow[] {
  return solution.choiceHistory
    .map(choice => ({
      ship: choice.ship,
      targetAfxId: choice.targetAfxId,
      numShipsLaunched: choice.numShipsLaunched,
      legendaryDrops: (choice.numShipsLaunched / 3) * (choice.legendarySupplyVector.get(rootId) ?? 0),
    }))
    .filter(row => row.legendaryDrops > 0.0001);
}

export function legendaryCraftProbabilityOf(solution: OptimizerSolution, rootId: string): number {
  return solution.recipeDag.get(rootId)?.legendaryCraftProbability ?? 0;
}
