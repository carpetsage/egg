export * from './artifacts';
export * from './missions';
export * from './loot';
export * from './optimizer-views';
export * from './optimizer-tree';
export * from './optimizer-cost';
export * from './tank-ids';

import type {
  CraftBudget,
  DAGNode,
  LaunchSolution,
  OptimizerConfig,
  OptimizerSolution,
  DropRow,
  RecipeDAG,
} from './types';
import { enumerateLaunchOptions, generateRecipeDag } from './phases';
import { ei, getArtifactTierPropsFromId, getCraftingInfoFromLevel, Inventory, InventoryItem, ShipsConfig } from 'lib';

import { iconURL } from 'lib';

// An undefined previousCraftsOverride means "read each target's own crafted
// count from the save"; a defined one applies to every target.
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

// Counted across all rarities: this is "copies you can feed a recipe", never
// "you already own a legendary". See OPTIMIZER.md.
export function computeBaseYield(
  playerInventory: Inventory | null | undefined,
  desiredArtifactNodeIds: string[],
  recipeDag: Map<string, DAGNode>
) {
  const baseYield = new Map<string, number>();

  if (playerInventory) {
    // Must match compileInnerLp's parent relation exactly.
    const hasParent = new Set<string>();
    for (const node of recipeDag.values()) {
      if (node.isLeaf) continue;
      for (const child of node.children) hasParent.add(child.nodeId);
    }
    const unconsumedTargets = new Set(desiredArtifactNodeIds.filter(id => !hasParent.has(id)));

    for (const nodeId of recipeDag.keys()) {
      if (unconsumedTargets.has(nodeId)) continue;
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
      totals.set(item, (totals.get(item) ?? 0) + rate * choice.numShipsLaunched);
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
      totals.set(egg, (totals.get(egg) ?? 0) + rate * choice.numShipsLaunched);
    }
  }

  return totals;
}

// Presentation-only fields. The worker path applies this on the main thread
// afterwards, so both it and optimize() below produce identical solutions.
export function finalizeSolutions(solutions: OptimizerSolution[], dag: RecipeDAG): OptimizerSolution[] {
  for (const solution of solutions) {
    solution.choiceHistory.sort((a: LaunchSolution, b: LaunchSolution) => a.ship.shipType - b.ship.shipType);
    solution.expectedDrops = computeExpectedDrops(solution, dag);
    solution.fuelByEgg = computeFuelByEgg(solution);
  }
  return solutions;
}

// Returns an array though today it's always one solution.
//
// Async for two reasons: the planner is a WebAssembly module loaded on first
// use, and `optimizer-core` is imported dynamically here on purpose. This
// barrel is what the components import, so a static import would pull the
// solver and its Emscripten glue into the main chunk — where nothing needs it,
// because the app plans through the worker. Only the tests call this.
export async function optimize(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  baseYield: Map<string, number>,
  launchPeriodSeconds = 0,
  maxGemCost?: number,
  craftBudget?: CraftBudget
) {
  const { desiredArtifactNodeIds, fuelTankCapacity, timeBudgetSeconds } = config;
  const options = enumerateLaunchOptions(playerConfig, dag, launchPeriodSeconds);
  const { optimizeFull } = await import('./optimizer-core');

  const solutions: OptimizerSolution[] = [
    await optimizeFull({
      options,
      recipeDag: dag,
      desiredArtifactNodeIds: desiredArtifactNodeIds,
      fuelCapacity: fuelTankCapacity,
      timeCapacity: timeBudgetSeconds,
      maximumCost: maxGemCost,
      baseYield: baseYield,
      craftBudget,
    }),
  ];

  return finalizeSolutions(solutions, dag);
}

export type {
  CraftBudget,
  OptimizerConfig,
  OptimizerSolution,
  LaunchOption,
  LaunchSolution,
  DropRow,
  DAGNode,
  DAGChildRef,
  RecipeDAG,
} from './types';
