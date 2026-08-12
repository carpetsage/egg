// Golden egg pricing of a plan's craft chain. The price curve itself is not
// re-derived here: `singleCraftCost` comes straight from lib, so this module
// only decides *how many* crafts of each node to price and from which starting
// craft index.
//
// One price is used throughout, for both the budget row and the reported bill:
// every craft at the player's next craft price. `fractionalCraftCost` says why
// that and not lib's `multiCraftCost`.

import type { CraftingPriceParams, Inventory } from 'lib';
import { getArtifactTierPropsFromId, singleCraftCost } from 'lib';
// Type-only, so this stays a one-way runtime dependency: optimizer-tree
// imports craftCostOf from here.
import type { CraftChainMetrics, RecipeTreeNode } from './optimizer-tree';
import type { OptimizerSolution, RecipeDAG } from './types';

// Leaves (raw drops) have no recipe, hence no price.
export function craftingPriceParamsOf(nodeId: string): CraftingPriceParams | null {
  return getArtifactTierPropsFromId(nodeId).recipe?.crafting_price ?? null;
}

// How many times the player has already crafted this item — the curve is
// indexed by that, so a veteran pays less than the sticker price.
export function previousCraftsOf(playerInventory: Inventory | null | undefined, nodeId: string): number {
  if (!playerInventory) return 0;
  const props = getArtifactTierPropsFromId(nodeId);
  return playerInventory.getItem({ name: props.afx_id, level: props.afx_level }).crafted;
}

// Every craft charged at the player's *next* craft price — the same linear
// price `computeCraftUnitPrices` writes into the golden egg budget row, and
// deliberately the same, so the number the card reports is the number the plan
// was chosen under.
//
// It over-states the true cost, because the curve decreases in the craft index
// (`multiCraftCost` is what the game actually charges, and this matches it only
// at one craft). Reporting the true curve instead would read as a bug: a player
// who sets a maximum craft cost and gets a plan priced well under it is looking
// at a cap that did not bind where it said it did. Pricing the report the way
// the cap prices keeps the two consistent; see `computeCraftUnitPrices` for why
// the cap has to err upward in the first place.
//
// Linear in `crafts`, which is also what makes it meaningful on the fractional
// counts an LP relaxation produces: no integer craft index to round to.
export function fractionalCraftCost(params: CraftingPriceParams, previousCrafts: number, crafts: number): number {
  if (!Number.isFinite(crafts) || crafts <= 0) return 0;
  return crafts * singleCraftCost(params, previousCrafts);
}

// Cost of performing `crafts` crafts of `nodeId` on top of what the player has
// already crafted. 0 for leaves and for non-positive counts.
export function craftCostOf(nodeId: string, crafts: number, playerInventory: Inventory | null | undefined): number {
  const params = craftingPriceParamsOf(nodeId);
  if (!params) return 0;
  return fractionalCraftCost(params, previousCraftsOf(playerInventory, nodeId), crafts);
}

// Linear per-craft prices for the golden egg budget row, one entry per
// craftable node in the DAG.
//
// The price curve decreases in the craft index, so the dearest craft the plan
// can possibly make of a node is the player's *next* one. Charging every craft
// at that price is the tangent of the true (concave) cost at zero: it can only
// over-state the bill, never under-state it, which is the direction a hard cap
// has to err in. See `CraftBudget` and OPTIMIZER.md for what that costs.
export function computeCraftUnitPrices(
  recipeDag: RecipeDAG,
  playerInventory: Inventory | null | undefined
): Map<string, number> {
  const prices = new Map<string, number>();
  for (const [nodeId, node] of recipeDag) {
    if (node.isLeaf) continue;
    const params = craftingPriceParamsOf(nodeId);
    if (!params) continue;
    prices.set(nodeId, singleCraftCost(params, previousCraftsOf(playerInventory, nodeId)));
  }
  return prices;
}

// Golden eggs are whole in game; fractional crafts are the only reason these
// aren't integers, and a rounded number is what a player can act on.
export function formatGoldenEggs(cost: number): string {
  return Math.round(cost).toLocaleString('en-US');
}

// A node can occur many times in the rendered tree (duplicates carry the same
// metrics), so dedupe by nodeId or the subtotal double-counts.
export function sumCraftChainCost(tree: RecipeTreeNode<CraftChainMetrics> | null): number {
  const seen = new Map<string, number>();
  const walk = (node: RecipeTreeNode<CraftChainMetrics>) => {
    if (!seen.has(node.nodeId)) seen.set(node.nodeId, node.metrics.goldenEggCost);
    node.children.forEach(walk);
  };
  if (tree) walk(tree);
  let total = 0;
  for (const cost of seen.values()) total += cost;
  return total;
}

export interface PlanCost {
  total: number;
  byNode: Map<string, number>; // priced nodes only
}

// Plan-wide cost, priced off the unscaled craftPrimal: the craft pool is shared
// across targets, so this is the single bill for the whole plan, not a sum of
// per-target shares.
export function computePlanCraftingCost(
  solution: OptimizerSolution,
  playerInventory: Inventory | null | undefined
): PlanCost {
  const byNode = new Map<string, number>();
  let total = 0;
  for (const [nodeId, crafts] of solution.craftPrimal) {
    const cost = craftCostOf(nodeId, crafts, playerInventory);
    if (cost <= 0) continue;
    byNode.set(nodeId, cost);
    total += cost;
  }
  return { total, byNode };
}
