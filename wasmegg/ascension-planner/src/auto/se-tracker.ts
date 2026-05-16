import { shiftCost } from 'lib';

/**
 * Computes SE costs for a sequence of shifts.
 * 
 * Each shift's cost depends on the current SE and the shift count.
 * As we "pay" for each shift, the remaining SE decreases and the shift count increases,
 * which affects the cost of the next shift.
 */
export function computeShiftCosts(
  startingSE: number,
  startingShiftCount: number,
  numShifts: number
) {
  const costs: number[] = [];
  let currentSE = startingSE;
  let currentShiftCount = startingShiftCount;

  for (let i = 0; i < numShifts; i++) {
    const cost = shiftCost(currentSE, currentShiftCount);
    costs.push(cost);
    currentSE -= cost;
    currentShiftCount++;
  }

  return {
    costs,
    totalCost: costs.reduce((sum, cost) => sum + cost, 0),
    endingSE: currentSE,
    endingShiftCount: currentShiftCount,
  };
}

/**
 * Computes cumulative SE costs for multiple ascensions, each having 13 shifts.
 */
export function computeMultiAscensionSECost(
  startingSE: number,
  startingShiftCount: number,
  numAscensions: number
) {
  let totalCost = 0;
  let currentSE = startingSE;
  let currentShiftCount = startingShiftCount;
  const perAscension: { cost: number; endingSE: number }[] = [];

  for (let i = 0; i < numAscensions; i++) {
    const result = computeShiftCosts(currentSE, currentShiftCount, 13);
    perAscension.push({
      cost: result.totalCost,
      endingSE: result.endingSE,
    });
    totalCost += result.totalCost;
    currentSE = result.endingSE;
    currentShiftCount = result.endingShiftCount;
  }

  return {
    totalCost,
    endingSE: currentSE,
    endingShiftCount: currentShiftCount,
    perAscension,
  };
}
