// Recipe-tree builders for the inventory and craft-chain panels. A shared
// ingredient can be reached through more than one branch; only its shallowest
// occurrence is expanded with children, and every other occurrence renders
// inline but is marked `isDuplicate` and never re-expanded, so the tree stays
// finite even over a cyclic DAG.

import type { Inventory } from 'lib';
import { getArtifactTierPropsFromId, iconURL } from 'lib';
import type { OptimizerSolution, RecipeDAG } from './types';

export interface RecipeTreeNode<M> {
  nodeId: string;
  name: string;
  iconUrl: string;
  depth: number;
  qtyPerParentCraft: number;
  isLeaf: boolean;
  isDuplicate: boolean; // true = not the canonical (shallowest) occurrence
  metrics: M;
  children: RecipeTreeNode<M>[]; // empty for leaves AND duplicate occurrences
}

export interface CanonicalOccurrence {
  // shallowest depth at which each nodeId is reached from the root
  minDepth: Map<string, number>;
  // the parent nodeId (null for the root) via which that shallowest depth was reached
  canonicalParent: Map<string, string | null>;
}

// BFS from rootId: the first time a nodeId is dequeued is its shallowest
// occurrence, with depth ties broken by enqueue order.
export function computeCanonicalOccurrence(rootId: string, dag: RecipeDAG): CanonicalOccurrence {
  const minDepth = new Map<string, number>();
  const canonicalParent = new Map<string, string | null>();
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number; parentId: string | null }[] = [
    { nodeId: rootId, depth: 0, parentId: null },
  ];

  while (queue.length > 0) {
    const { nodeId, depth, parentId } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = dag.get(nodeId);
    if (!node) continue; // matches buildRecipeTree's skip of unresolved refs

    minDepth.set(nodeId, depth);
    canonicalParent.set(nodeId, parentId);

    for (const child of node.children) {
      queue.push({ nodeId: child.nodeId, depth: depth + 1, parentId: nodeId });
    }
  }

  return { minDepth, canonicalParent };
}

// DFS from rootId building the display tree. Only the canonical occurrence of
// each nodeId is expanded into children; the `expanded` set additionally
// guards against walking any nodeId's children twice, which is what protects
// against infinite recursion over a cyclic DAG.
export function buildRecipeTree<M>(
  rootId: string,
  dag: RecipeDAG,
  canonical: CanonicalOccurrence,
  metricsFor: (nodeId: string) => M
): RecipeTreeNode<M> | null {
  if (!dag.has(rootId)) return null;

  const expanded = new Set<string>();

  function build(nodeId: string, depth: number, qtyPerParentCraft: number, parentId: string | null): RecipeTreeNode<M> {
    const node = dag.get(nodeId)!;
    const props = getArtifactTierPropsFromId(nodeId);
    const isCanonical =
      depth === canonical.minDepth.get(nodeId) && parentId === (canonical.canonicalParent.get(nodeId) ?? null);
    const isDuplicate = !isCanonical;

    const shouldExpand = !isDuplicate && !expanded.has(nodeId);
    if (shouldExpand) expanded.add(nodeId);

    const children: RecipeTreeNode<M>[] = shouldExpand
      ? node.children
          .filter(child => dag.has(child.nodeId))
          .map(child => build(child.nodeId, depth + 1, child.quantity, nodeId))
      : [];

    return {
      nodeId,
      name: props.name,
      iconUrl: iconURL('egginc/' + props.icon_filename, 64),
      depth,
      qtyPerParentCraft,
      isLeaf: node.isLeaf,
      isDuplicate,
      metrics: metricsFor(nodeId),
      children,
    };
  }

  return build(rootId, 0, 1, null);
}

// Owned-inventory (all rarities) tree. A null playerInventory still builds
// the tree with zero-valued metrics, so the panel's shape is consistent.
export function computeInventoryTree(
  rootId: string,
  dag: RecipeDAG,
  playerInventory: Inventory | null
): RecipeTreeNode<{ have: number }> | null {
  const canonical = computeCanonicalOccurrence(rootId, dag);
  const metricsFor = (nodeId: string): { have: number } => {
    if (!playerInventory) return { have: 0 };
    const props = getArtifactTierPropsFromId(nodeId);
    const item = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
    return { have: item.haveRarity[0] + item.haveRarity[1] + item.haveRarity[2] + item.haveRarity[3] };
  };
  return buildRecipeTree(rootId, dag, canonical, metricsFor);
}

export interface CraftChainMetrics {
  owned: number;
  dropped: number;
  crafted: number;
  consumed: number;
}

// Craft-chain breakdown tree for the probability display; consumed[B] is the
// LP-implied number of B eaten by the chosen recipes.
export function computeCraftChainTree(
  solution: OptimizerSolution,
  rootId: string,
  playerInventory: Inventory | null
): RecipeTreeNode<CraftChainMetrics> | null {
  const dag = solution.recipeDag;
  if (!dag.has(rootId)) return null;

  const consumed = new Map<string, number>();
  for (const [nodeId, node] of dag) {
    if (node.isLeaf) continue;
    const crafted = solution.craftPrimal.get(nodeId) ?? 0;
    if (crafted <= 0) continue;
    for (const child of node.children) {
      consumed.set(child.nodeId, (consumed.get(child.nodeId) ?? 0) + crafted * child.quantity);
    }
  }

  const canonical = computeCanonicalOccurrence(rootId, dag);
  const metricsFor = (nodeId: string): CraftChainMetrics => {
    const props = getArtifactTierPropsFromId(nodeId);
    let ownedCount = 0;
    if (playerInventory) {
      const it = playerInventory.getItem({ name: props.afx_id, level: props.afx_level });
      ownedCount = it.haveRarity[0] + it.haveRarity[1] + it.haveRarity[2] + it.haveRarity[3];
    }
    return {
      owned: ownedCount,
      dropped: Math.max(0, (solution.finalYieldVector.get(nodeId) ?? 0) - (solution.baseYield.get(nodeId) ?? 0)),
      crafted: solution.craftPrimal.get(nodeId) ?? 0,
      consumed: consumed.get(nodeId) ?? 0,
    };
  };

  return buildRecipeTree(rootId, dag, canonical, metricsFor);
}
