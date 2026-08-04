// Flat display helpers derived from an OptimizerSolution; the recipe-tree
// builders live in optimizer-tree.ts.

import type { ei, MissionType } from 'lib';
import type { CraftChainMetrics, RecipeTreeNode } from './optimizer-tree';
import type { OptimizerSolution, TargetProbability } from './types';

export interface MissionLegendaryRow {
  ship: MissionType;
  targetAfxId: ei.ArtifactSpec.Name;
  numShipsLaunched: number;
  legendaryDrops: number;
}

// One target's worth of presentation data, resolved against that target's own
// nodeId rather than the plan's primary target.
export interface TargetView {
  nodeId: string;
  name: string;
  iconUrl: string;
  perTarget: TargetProbability;
  pCraft: number;
  lambda: number;
  craftChainTree: RecipeTreeNode<CraftChainMetrics> | null;
  missionLegendarySources: MissionLegendaryRow[];
  dropDataIsSparse: boolean;
}

// Invert P(drop) = 1 - e^(-lambda); 0 outside (0, 1).
export function lambdaFromDropProbability(p: number): number {
  return p > 0 && p < 1 ? -Math.log(1 - p) : 0;
}

// Per-mission expected direct legendary drops of `rootId`.
export function computeMissionLegendaryRows(solution: OptimizerSolution, rootId: string): MissionLegendaryRow[] {
  return solution.choiceHistory
    .map(choice => ({
      ship: choice.ship,
      targetAfxId: choice.targetAfxId,
      numShipsLaunched: choice.numShipsLaunched,
      legendaryDrops: choice.numShipsLaunched * (choice.legendarySupplyVector.get(rootId) ?? 0),
    }))
    .filter(row => row.legendaryDrops > 0.0001);
}

export function legendaryCraftProbabilityOf(solution: OptimizerSolution, rootId: string): number {
  return solution.recipeDag.get(rootId)?.legendaryCraftProbability ?? 0;
}
