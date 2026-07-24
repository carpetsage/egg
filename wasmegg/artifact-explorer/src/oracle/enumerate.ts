// Brute-force side of the oracle: exhaustively search integer launch
// allocations under the fuel/time budgets and return the best achievable
// score according to the independent evaluator.
//
// Yields and direct drops are nonnegative and the LP value is monotone in
// inventory, so the objective is monotone in every k_i: some optimal
// allocation is always "maximal" (no option can be incremented without
// busting a budget). Enumerating only maximal allocations is therefore an
// exact search, not a heuristic.

import { evaluateAllocation, evaluateAllocationFloat, OracleInstance } from './evaluate';

export interface BruteForceResult {
  bestScore: number;
  bestProbability: number;
  bestAllocation: number[];
  feasibleCount: number; // all feasible integer vectors
  evaluatedCount: number; // maximal vectors actually run through the LP
}

export function countFeasible(inst: OracleInstance, cap: number): number | null {
  const n = inst.options.length;
  let count = 0;
  const walk = (i: number, fuelLeft: number, timeLeft: number): boolean => {
    if (i === n) {
      count++;
      return count <= cap;
    }
    const opt = inst.options[i];
    const maxK = Math.min(Math.floor(fuelLeft / opt.actualFuel), Math.floor(timeLeft / opt.actualTime));
    for (let k = 0; k <= maxK; k++) {
      if (!walk(i + 1, fuelLeft - k * opt.actualFuel, timeLeft - k * opt.actualTime)) {
        return false;
      }
    }
    return true;
  };
  return walk(0, inst.fuelCapacity, inst.timeCapacity) ? count : null;
}

// Candidates are ranked with the float evaluator (error ~1e-9 against gaps
// asserted at 1e-3 scale); every candidate within RANKING_SLOP of the float
// best is then re-evaluated exactly, so a float near-tie cannot cost the
// true optimum and the returned numbers are exact.
const RANKING_SLOP = 1e-7;
const MAX_FINALISTS = 8;

export function bruteForceBest(inst: OracleInstance): BruteForceResult {
  const n = inst.options.length;
  // A zero-cost option can be launched without bound, so no allocation is ever
  // maximal, the enumeration finds no finalists, and the result would silently
  // collapse to bestProbability = 0. The generator's feasibility filter never
  // emits such an instance, but guard here so a direct caller fails loudly
  // instead of receiving a fake gap = 0.
  for (const opt of inst.options) {
    if (opt.actualFuel <= 0 && opt.actualTime <= 0) {
      throw new Error('option with zero fuel and time cost admits unbounded launches; instance is ill-posed');
    }
  }
  const allocation = new Array<number>(n).fill(0);
  let feasibleCount = 0;
  let evaluatedCount = 0;
  let bestFloat = -Infinity;
  let finalists: number[][] = [];

  const isMaximal = (fuelLeft: number, timeLeft: number): boolean =>
    !inst.options.some(opt => opt.actualFuel <= fuelLeft && opt.actualTime <= timeLeft);

  const walk = (i: number, fuelLeft: number, timeLeft: number) => {
    if (i === n) {
      feasibleCount++;
      if (!isMaximal(fuelLeft, timeLeft)) {
        return;
      }
      const score = evaluateAllocationFloat(inst, allocation);
      evaluatedCount++;
      if (score > bestFloat + RANKING_SLOP) {
        bestFloat = score;
        finalists = [allocation.slice()];
      } else if (score > bestFloat - RANKING_SLOP) {
        bestFloat = Math.max(bestFloat, score);
        if (finalists.length < MAX_FINALISTS) {
          finalists.push(allocation.slice());
        }
      }
      return;
    }
    const opt = inst.options[i];
    const maxK = Math.min(Math.floor(fuelLeft / opt.actualFuel), Math.floor(timeLeft / opt.actualTime));
    for (let k = 0; k <= maxK; k++) {
      allocation[i] = k;
      walk(i + 1, fuelLeft - k * opt.actualFuel, timeLeft - k * opt.actualTime);
    }
    allocation[i] = 0;
  };

  walk(0, inst.fuelCapacity, inst.timeCapacity);

  const best: BruteForceResult = {
    bestScore: -Infinity,
    bestProbability: 0,
    bestAllocation: new Array<number>(n).fill(0),
    feasibleCount,
    evaluatedCount,
  };
  for (const candidate of finalists) {
    const exact = evaluateAllocation(inst, candidate);
    if (exact.score > best.bestScore) {
      best.bestScore = exact.score;
      best.bestProbability = exact.probability;
      best.bestAllocation = candidate;
    }
  }
  return best;
}
