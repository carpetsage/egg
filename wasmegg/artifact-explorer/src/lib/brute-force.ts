// ============================================================
// Brute-Force Optimizer — exhaustive local search
// ============================================================
//
// Uses the identical Objective function as Frank-Wolfe but finds
// the best allocation purely by search, no gradients or continuous
// relaxation. Intentionally slow — for debugging only.
//
// Strategy: for every option as a starting point, fill the budget
// with as many of that option as possible, then greedily hill-climb
// by adding one unit at a time (pick the option with the highest
// marginal Objective gain), then apply pairwise swaps to escape
// local optima. Yields to the event loop between starting points
// and calls onImprovement whenever a new best is found.

import type { LaunchOption, RecipeDAG, OptimizerSolution, LaunchSolution } from './types';
import { Objective } from './frank-wolfe';

export interface BruteForceConfig {
  options: LaunchOption[];
  dag: RecipeDAG;
  desiredArtifactNodeIds: string[];
  fuelCapacity: number;
  totalTimeUnits: number;
  baseYield?: Map<string, number>;
}

export interface CancellationToken {
  cancelled: boolean;
}

// ============================================================
// Yield vector helpers
// ============================================================

function addOption(yieldVector: Map<string, number>, option: LaunchOption, count: number): Map<string, number> {
  const result = new Map(yieldVector);
  for (const [k, v] of option.yield_vector) {
    result.set(k, (result.get(k) ?? 0) + count * v);
  }
  return result;
}

function subtractOption(yieldVector: Map<string, number>, option: LaunchOption, count: number): Map<string, number> {
  const result = new Map(yieldVector);
  for (const [k, v] of option.yield_vector) {
    const updated = (result.get(k) ?? 0) - count * v;
    if (updated <= 0) result.delete(k);
    else result.set(k, updated);
  }
  return result;
}

function buildSolution(
  allocation: Int32Array,
  yieldVector: Map<string, number>,
  prob: number,
  options: LaunchOption[]
): OptimizerSolution {
  const choiceHistory: LaunchSolution[] = [];
  let fuelUsed = 0;
  let timeUsed = 0;
  for (let i = 0; i < options.length; i++) {
    const count = allocation[i];
    if (count === 0) continue;
    choiceHistory.push({
      ship: options[i].ship,
      actual_fuel: options[i].actual_fuel,
      actual_fuel_by_egg: options[i].fuel_by_egg,
      actual_time: options[i].actual_time,
      target: options[i].target ?? 'none',
      targetAfxId: options[i].targetAfxId,
      num_ships_launched: 3 * count,
      from_fw: false,
      supply_vector: options[i].supply_vector,
    });
    fuelUsed += options[i].actual_fuel * count;
    timeUsed += options[i].actual_time * count;
  }
  return {
    best_probability: prob,
    craft_probability: 0,
    drop_probability: 0,
    fuel_used: fuelUsed,
    fuel_by_egg: new Map(),
    time_units_used: timeUsed,
    choice_history: choiceHistory,
    final_yield_vector: new Map(yieldVector),
    expected_drops: [],
  };
}

// ============================================================
// Greedy forward pass + pairwise swaps (synchronous, one start)
// ============================================================

export function localSearch(
  initialAllocation: Int32Array,
  initialYield: Map<string, number>,
  initialFuelLeft: number,
  initialTimeLeft: number,
  options: LaunchOption[],
  dag: RecipeDAG,
  desiredArtifactNodeIds: string[]
): { allocation: Int32Array; yieldVector: Map<string, number>; prob: number } {
  const allocation = new Int32Array(initialAllocation);
  let yieldVector = new Map(initialYield);
  let fuelLeft = initialFuelLeft;
  let timeLeft = initialTimeLeft;
  let prob = Objective(yieldVector, desiredArtifactNodeIds, dag);

  // Greedy forward pass: keep adding the best single unit
  let improved = true;
  while (improved) {
    improved = false;
    let bestIdx = -1;
    let bestProb = prob;
    let bestYield: Map<string, number> | null = null;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.actual_fuel > fuelLeft || opt.actual_time > timeLeft) continue;
      const candidate = addOption(yieldVector, opt, 1);
      const p = Objective(candidate, desiredArtifactNodeIds, dag);
      if (p > bestProb) {
        bestProb = p;
        bestIdx = i;
        bestYield = candidate;
      }
    }

    if (bestIdx >= 0 && bestYield !== null) {
      allocation[bestIdx]++;
      fuelLeft -= options[bestIdx].actual_fuel;
      timeLeft -= options[bestIdx].actual_time;
      yieldVector = bestYield;
      prob = bestProb;
      improved = true;
    }
  }

  // Pairwise swap: remove one unit of i, add one unit of j
  let swapImproved = true;
  while (swapImproved) {
    swapImproved = false;
    for (let i = 0; i < options.length; i++) {
      if (allocation[i] === 0) continue;
      for (let j = 0; j < options.length; j++) {
        if (i === j) continue;
        const fuelDelta = options[j].actual_fuel - options[i].actual_fuel;
        const timeDelta = options[j].actual_time - options[i].actual_time;
        if (fuelLeft - fuelDelta < 0 || timeLeft - timeDelta < 0) continue;

        const candidate = addOption(subtractOption(yieldVector, options[i], 1), options[j], 1);
        const p = Objective(candidate, desiredArtifactNodeIds, dag);
        if (p > prob) {
          allocation[i]--;
          allocation[j]++;
          fuelLeft -= fuelDelta;
          timeLeft -= timeDelta;
          yieldVector = candidate;
          prob = p;
          swapImproved = true;
          break; // allocation[i] may now be 0; restart the outer while loop
        }
      }
    }
  }

  return { allocation, yieldVector, prob };
}

// ============================================================
// Main optimizer — async, yields between starting points
// ============================================================

const yieldToEventLoop = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

export async function OptimizeBruteForce(
  config: BruteForceConfig,
  onImprovement: (solution: OptimizerSolution) => void,
  token: CancellationToken
): Promise<void> {
  const { options, dag, desiredArtifactNodeIds, fuelCapacity, totalTimeUnits, baseYield } = config;

  if (options.length === 0) return;

  const emptyBase = (): Map<string, number> => new Map(baseYield);

  let bestProb = -1;

  const consider = (result: ReturnType<typeof localSearch>) => {
    if (result.prob > bestProb) {
      bestProb = result.prob;
      onImprovement(buildSolution(result.allocation, result.yieldVector, result.prob, options));
    }
  };

  // Starting point: empty allocation, pure greedy from scratch
  if (!token.cancelled) {
    consider(
      localSearch(
        new Int32Array(options.length),
        emptyBase(),
        fuelCapacity,
        totalTimeUnits,
        options,
        dag,
        desiredArtifactNodeIds
      )
    );
    await yieldToEventLoop();
  }

  // One starting point per option: fill budget with that option, then hill-climb
  for (let s = 0; s < options.length; s++) {
    if (token.cancelled) return;

    const opt = options[s];
    const maxByFuel = opt.actual_fuel > 0 ? Math.floor(fuelCapacity / opt.actual_fuel) : 0;
    const maxByTime = opt.actual_time > 0 ? Math.floor(totalTimeUnits / opt.actual_time) : 0;
    const initCount = Math.min(maxByFuel, maxByTime);
    if (initCount === 0) continue;

    const initAlloc = new Int32Array(options.length);
    initAlloc[s] = initCount;

    consider(
      localSearch(
        initAlloc,
        addOption(emptyBase(), opt, initCount),
        fuelCapacity - initCount * opt.actual_fuel,
        totalTimeUnits - initCount * opt.actual_time,
        options,
        dag,
        desiredArtifactNodeIds
      )
    );

    await yieldToEventLoop();
  }
}
