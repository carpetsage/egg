// Shared fixtures for the optimizer specs: hand-built DAG nodes and launch
// options with small controlled numbers so tests can assert exact arithmetic,
// plus the in-process planner entry point the pipeline specs drive.
//
// `optimize` lives here rather than in `index.ts` because the app never calls
// it — components plan through the worker — and `index.ts` is the barrel every
// component imports. Keeping the only path from that barrel to `optimizer-core`
// out of it keeps the solver and its 3.4MB of Emscripten glue out of the main
// chunk by module graph rather than by a lazy import nothing would notice
// losing.

import { ei, MissionType, type ShipsConfig } from 'lib';
import type { CraftBudget, DAGNode, LaunchOption, OptimizerConfig, OptimizerSolution, RecipeDAG } from './types';
import { finalizeSolutions } from './index';
import { optimizeFull } from './optimizer-core';
import { enumerateLaunchOptions } from './phases';

export function makeNode(id: string, isLeaf: boolean, children: [string, number][] = [], pCraft = 0): DAGNode {
  return {
    id,
    isLeaf,
    children: children.map(([nodeId, quantity]) => ({ nodeId, quantity })),
    legendaryCraftProbability: pCraft,
  };
}

// The ship is irrelevant to the optimizer core (only the presentation layer
// reads it), so every fixture option flies the same one.
const fixtureShip = new MissionType(ei.MissionInfo.Spaceship.CHICKEN_ONE, ei.MissionInfo.DurationType.SHORT);

let seq = 0;

export function makeOpt(
  actualFuel: number,
  actualTime: number,
  yieldEntries: [string, number][],
  legendaryEntries: [string, number][] = [],
  targetAfxId: ei.ArtifactSpec.Name = ei.ArtifactSpec.Name.UNKNOWN
): LaunchOption {
  return {
    id: `opt-${seq++}`,
    ship: fixtureShip,
    target: null,
    targetAfxId,
    actualFuel,
    fuelByEgg: new Map(),
    actualTime,
    rawTime: actualTime,
    // Free by default, so a fixture menu survives any `maximumCost`; the specs
    // that exercise the gem cap override it per option.
    cost: 0,
    supplyVector: new Map(yieldEntries),
    yieldVector: new Map(yieldEntries),
    legendaryYieldVector: new Map(legendaryEntries),
  };
}

// Plan in-process, the way the worker does on the other side of the seam.
// Async because the planner is a WebAssembly module loaded on first use.
export async function optimize(
  config: OptimizerConfig,
  playerConfig: ShipsConfig,
  dag: RecipeDAG,
  baseYield: Map<string, number>,
  launchPeriodSeconds = 0,
  maxGemCost?: number,
  craftBudget?: CraftBudget
): Promise<OptimizerSolution> {
  const { desiredArtifactNodeIds, fuelTankCapacity, timeBudgetSeconds } = config;
  const solution = await optimizeFull({
    options: enumerateLaunchOptions(playerConfig, dag, launchPeriodSeconds),
    recipeDag: dag,
    desiredArtifactNodeIds,
    fuelCapacity: fuelTankCapacity,
    timeCapacity: timeBudgetSeconds,
    maximumCost: maxGemCost,
    baseYield,
    craftBudget,
  });
  return finalizeSolutions([solution], dag)[0];
}

export function makeSolution(overrides: Partial<OptimizerSolution>): OptimizerSolution {
  return {
    bestProbability: 0,
    craftProbability: 0,
    dropProbability: 0,
    expectedCrafts: 0,
    fuelUsed: 0,
    fuelByEgg: new Map(),
    timeUnitsUsed: 0,
    runningTimeSeconds: 0,
    choiceHistory: [],
    expectedDrops: [],
    finalYieldVector: new Map(),
    baseYield: new Map(),
    recipeDag: new Map(),
    craftPrimal: new Map(),
    perTarget: [],
    jointProbability: 0,
    ...overrides,
  };
}
