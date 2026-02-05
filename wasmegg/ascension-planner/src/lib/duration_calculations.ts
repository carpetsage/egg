// Duration calculations for ascension steps
// Calculates how long each step will take based on visit type

import type { AscensionStep, InitialData, VirtueEgg, StepMetrics } from '@/types';
import { getReturnTimeOffset } from './missions-virtue';
import { TE_BREAKPOINTS } from './virtue';
import { computeMetricsAtPurchaseIndex, getAllPurchasesSorted, type UnifiedPurchase } from './step_metrics';

/**
 * Context for duration calculations
 */
export interface DurationContext {
  initialData: InitialData;
  step: AscensionStep;
  previousSteps: AscensionStep[];
  metrics: StepMetrics;
}

/**
 * Calculate how many eggs need to be delivered to earn a certain number of TE
 * starting from the current delivered count.
 */
export function eggsRequiredForTE(currentDelivered: number, targetTE: number): number {
  if (targetTE <= 0) return 0;

  // Find current TE count
  let currentTE = 0;
  for (let i = 0; i < TE_BREAKPOINTS.length; i++) {
    if (currentDelivered >= TE_BREAKPOINTS[i]) {
      currentTE = i + 1;
    } else {
      break;
    }
  }

  // Find threshold index for target TE after current
  const targetTEIndex = currentTE + targetTE - 1;
  if (targetTEIndex >= TE_BREAKPOINTS.length) {
    return Infinity; // Can't earn that many TE
  }

  return TE_BREAKPOINTS[targetTEIndex] - currentDelivered;
}

/**
 * Count current TE earned from delivered eggs
 */
export function countTEFromDelivered(delivered: number): number {
  let count = 0;
  for (let i = 0; i < TE_BREAKPOINTS.length; i++) {
    if (delivered >= TE_BREAKPOINTS[i]) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Get the next TE threshold for a given delivered count
 */
export function nextTEThreshold(delivered: number): number {
  for (let i = 0; i < TE_BREAKPOINTS.length; i++) {
    if (delivered < TE_BREAKPOINTS[i]) {
      return TE_BREAKPOINTS[i];
    }
  }
  return Infinity;
}

/**
 * Calculate time (in seconds) to lay a target number of eggs.
 * Accounts for population growth via IHR.
 *
 * @param targetEggs - Number of eggs to lay
 * @param startingPop - Starting population (typically 0 for fresh visits)
 * @param offlineIHR - Offline IHR in chickens/minute
 * @param perChickenELR - Eggs/minute per chicken
 * @param maxPopulation - Maximum population (min of hab cap and shipping-limited pop)
 * @returns Time in seconds
 */
export function timeToLayEggs(
  targetEggs: number,
  startingPop: number,
  offlineIHR: number,
  perChickenELR: number,
  maxPopulation: number
): number {
  if (targetEggs <= 0) return 0;
  if (perChickenELR <= 0) return Infinity;

  // Initial population (minimum 1 chicken to start laying)
  const pop = Math.max(startingPop, 1);

  // No population growth - linear calculation
  if (offlineIHR <= 0 || pop >= maxPopulation) {
    const layingRate = pop * perChickenELR; // eggs/min
    return (targetEggs / layingRate) * 60; // convert to seconds
  }

  // Population grows: solve quadratic
  // eggs(t) = integral of (pop + IHR*t) * perChickenELR from 0 to T
  // eggs(T) = perChickenELR * (pop*T + IHR*T²/2)
  // Solving for T: IHR*T²/2 + pop*T - targetEggs/perChickenELR = 0

  const a = offlineIHR / 2;
  const b = pop;
  const c = -targetEggs / perChickenELR;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;

  let timeMinutes = (-b + Math.sqrt(discriminant)) / (2 * a);

  // Check if we hit max population before reaching target
  const timeToMaxPop = (maxPopulation - pop) / offlineIHR;

  if (timeMinutes > timeToMaxPop) {
    // Calculate eggs laid during growth phase
    const eggsInGrowthPhase = perChickenELR * (pop * timeToMaxPop + (offlineIHR * timeToMaxPop * timeToMaxPop) / 2);
    const remainingEggs = targetEggs - eggsInGrowthPhase;

    if (remainingEggs > 0) {
      // Calculate time at max population
      const maxPopLayingRate = maxPopulation * perChickenELR;
      const timeAtMaxPop = remainingEggs / maxPopLayingRate;
      timeMinutes = timeToMaxPop + timeAtMaxPop;
    }
  }

  return timeMinutes * 60; // convert to seconds
}

/**
 * Calculate time (in seconds) to accumulate a target amount of cash.
 * Similar to egg laying but for earnings.
 *
 * @param targetCash - Cash needed
 * @param startingPop - Starting population
 * @param offlineIHR - Offline IHR in chickens/minute
 * @param perChickenEarnings - Earnings/second per chicken at max population
 * @param maxPopulation - Maximum population
 * @returns Time in seconds
 */
export function timeToAccumulateCash(
  targetCash: number,
  startingPop: number,
  offlineIHR: number,
  perChickenEarnings: number,
  maxPopulation: number
): number {
  if (targetCash <= 0) return 0;
  if (perChickenEarnings <= 0) return Infinity;

  const pop = Math.max(startingPop, 1);

  // No growth - linear
  if (offlineIHR <= 0 || pop >= maxPopulation) {
    const earningsRate = pop * perChickenEarnings; // per second
    return targetCash / earningsRate;
  }

  // Convert IHR from chickens/min to chickens/sec for consistency
  const ihrPerSec = offlineIHR / 60;

  // Population grows: solve quadratic
  // cash(T) = integral of (pop + ihrPerSec*t) * perChickenEarnings from 0 to T
  // cash(T) = perChickenEarnings * (pop*T + ihrPerSec*T²/2)

  const a = ihrPerSec / 2;
  const b = pop;
  const c = -targetCash / perChickenEarnings;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;

  let timeSec = (-b + Math.sqrt(discriminant)) / (2 * a);

  // Check if we hit max population before reaching target
  const timeToMaxPopSec = (maxPopulation - pop) / ihrPerSec;

  if (timeSec > timeToMaxPopSec) {
    // Calculate cash earned during growth phase
    const cashInGrowthPhase =
      perChickenEarnings * (pop * timeToMaxPopSec + (ihrPerSec * timeToMaxPopSec * timeToMaxPopSec) / 2);
    const remainingCash = targetCash - cashInGrowthPhase;

    if (remainingCash > 0) {
      // Calculate time at max population
      const maxPopEarningsRate = maxPopulation * perChickenEarnings;
      const timeAtMaxPop = remainingCash / maxPopEarningsRate;
      timeSec = timeToMaxPopSec + timeAtMaxPop;
    }
  }

  return timeSec;
}

/**
 * Calculate total purchase cost for a step from all logs
 */
export function calculateTotalPurchaseCost(step: AscensionStep): number {
  let total = 0;

  // Research purchases
  if (step.researchLog) {
    for (const entry of step.researchLog) {
      total += entry.cost;
    }
  }

  // Vehicle purchases
  if (step.vehicleLog) {
    for (const entry of step.vehicleLog) {
      if (entry.type === 'buy' || entry.type === 'add_car') {
        total += entry.cost;
      }
    }
  }

  // Add hab upgrade purchases
  if (step.habUpgradeLog) {
    for (const entry of step.habUpgradeLog) {
      total += entry.cost;
    }
  }

  return total;
}

/**
 * Result of computing incremental purchase times
 */
export interface IncrementalPurchaseTime {
  purchase: UnifiedPurchase;
  timeToEarn: number;  // seconds to earn cost for this purchase
  cumulativeTime: number;  // total time from start to complete this purchase
  metricsAfter: StepMetrics;  // metrics after this purchase is made
  earningsPerSecBefore: number;  // Debug: earnings/sec before this purchase
  populationAtPurchase: number;  // Debug: population when making this purchase
}

/**
 * Compute time-to-earn for each purchase in a step.
 * Each purchase uses the earnings rate AFTER all previous purchases.
 *
 * @param step - Current step
 * @param previousSteps - All steps before this one
 * @param initialData - Initial player data
 * @returns Array of purchase times with associated data
 */
export function computeIncrementalPurchaseTimes(
  step: AscensionStep,
  previousSteps: AscensionStep[],
  initialData: InitialData
): IncrementalPurchaseTime[] {
  const allPurchases = getAllPurchasesSorted(step);
  const results: IncrementalPurchaseTime[] = [];

  if (allPurchases.length === 0) {
    return results;
  }

  let cumulativeTime = 0;
  let currentPopulation = 1;  // Each visit starts with 1 chicken

  for (let i = 0; i < allPurchases.length; i++) {
    const purchase = allPurchases[i];

    // Get metrics BEFORE this purchase (after all previous purchases in this step)
    const metricsBefore = computeMetricsAtPurchaseIndex(step, previousSteps, initialData, i);

    // Calculate per-chicken earnings from the projected earnings and hab capacity
    const perChickenEarnings = metricsBefore.offlineEarningsProjected / Math.max(metricsBefore.habCapacity, 1);
    const maxPop = Math.min(
      metricsBefore.habCapacity,
      metricsBefore.shippingCapacity / Math.max(metricsBefore.elr, 1)
    );

    // Calculate time to earn this purchase at current state
    const timeForThisPurchase = timeToAccumulateCash(
      purchase.cost,
      currentPopulation,
      metricsBefore.offlineIHR,
      perChickenEarnings,
      maxPop
    );

    cumulativeTime += timeForThisPurchase;

    // Get metrics AFTER this purchase
    const metricsAfter = computeMetricsAtPurchaseIndex(step, previousSteps, initialData, i + 1);

    results.push({
      purchase,
      timeToEarn: timeForThisPurchase,
      cumulativeTime,
      metricsAfter,
      earningsPerSecBefore: metricsBefore.offlineEarningsProjected,
      populationAtPurchase: currentPopulation,
    });

    // Update population for next iteration
    // Estimate population after waiting for this purchase
    // Population grows at offlineIHR (chickens/min) up to maxPop
    const ihrPerSec = metricsBefore.offlineIHR / 60;
    const popGrowth = ihrPerSec * timeForThisPurchase;
    currentPopulation = Math.min(currentPopulation + popGrowth, maxPop);
  }

  return results;
}

/**
 * Get the maximum rocket return time for a Humility step
 */
export function getMaxRocketReturnTime(step: AscensionStep, initialData: InitialData): number {
  if (!step.scheduledLaunches || step.scheduledLaunches.length === 0) {
    return 0;
  }

  let maxReturn = 0;
  for (const launch of step.scheduledLaunches) {
    const returnTime = getReturnTimeOffset(launch, initialData.epicResearch);
    maxReturn = Math.max(maxReturn, returnTime);
  }

  return maxReturn;
}

/**
 * Compute duration for a final visit (farming to target TE)
 */
export function computeFinalVisitDuration(ctx: DurationContext): number {
  const { step, initialData, metrics } = ctx;
  const eggType = step.eggType;

  // Get target TE to gain for this egg
  const targetTE = initialData.targetGains[eggType] || 0;
  if (targetTE <= 0) return 0;

  // Calculate current delivered for this egg (from initial + previous steps)
  const currentDelivered = getCurrentDelivered(eggType, initialData, ctx.previousSteps);

  // Calculate eggs needed to reach target TE
  const eggsNeeded = eggsRequiredForTE(currentDelivered, targetTE);
  if (eggsNeeded === Infinity || eggsNeeded <= 0) return 0;

  // Calculate time to lay those eggs
  // perChickenELR = total ELR / population at max
  const perChickenELR = metrics.elr / Math.max(metrics.habCapacity, 1);
  const maxPop = Math.min(metrics.habCapacity, metrics.shippingCapacity / metrics.elr);

  return timeToLayEggs(eggsNeeded, 0, metrics.offlineIHR, perChickenELR * 60, maxPop);
}

/**
 * Compute duration for an intermediate visit (purchases only)
 * Uses incremental purchase time calculation - each purchase uses the
 * earnings rate AFTER all previous purchases in this step.
 */
export function computeIntermediateVisitDuration(ctx: DurationContext): number {
  const { step, initialData, previousSteps } = ctx;

  // Calculate incremental purchase times
  const purchaseTimes = computeIncrementalPurchaseTimes(step, previousSteps, initialData);

  // Sum all individual purchase times
  const totalCashTime = purchaseTimes.reduce((sum, pt) => sum + pt.timeToEarn, 0);

  // If no purchases, check rocket wait time (Humility only)
  if (purchaseTimes.length === 0 || totalCashTime <= 0) {
    if (step.eggType === 'humility') {
      return getMaxRocketReturnTime(step, initialData);
    }
    return 0;
  }

  // For Humility, also consider rocket return time
  if (step.eggType === 'humility') {
    const rocketTime = getMaxRocketReturnTime(step, initialData);
    return Math.max(totalCashTime, rocketTime);
  }

  return totalCashTime;
}

/**
 * Main function to compute step duration
 */
export function computeStepDuration(ctx: DurationContext): number {
  const { step } = ctx;

  if (step.isFinalVisit) {
    return computeFinalVisitDuration(ctx);
  } else {
    return computeIntermediateVisitDuration(ctx);
  }
}

/**
 * Get current delivered count for a virtue egg, including previous steps
 * (Placeholder - in full implementation would track eggs laid per step)
 */
export function getCurrentDelivered(
  eggType: VirtueEgg,
  initialData: InitialData,
  _previousSteps: AscensionStep[]
): number {
  // Start with initial delivered count
  return initialData.virtueEggsLaid[eggType] || 0;

  // TODO: Add eggs laid from previous final visits to this egg
}

/**
 * Compute timeline for all steps
 */
export interface StepTimeline {
  stepId: string;
  eggType: VirtueEgg;
  visitNumber: number;
  arrivalTimestamp: number;
  departureTimestamp: number;
  duration: number;
}

export function computeTimeline(
  steps: AscensionStep[],
  initialData: InitialData,
  getMetrics: (step: AscensionStep, previousSteps: AscensionStep[]) => StepMetrics
): StepTimeline[] {
  const timeline: StepTimeline[] = [];
  let currentTime = initialData.startTime;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const previousSteps = steps.slice(0, i);
    const metrics = getMetrics(step, previousSteps);

    const ctx: DurationContext = {
      initialData,
      step,
      previousSteps,
      metrics,
    };

    const duration = computeStepDuration(ctx);
    const arrival = currentTime;
    const departure = arrival + duration * 1000; // Convert seconds to ms

    timeline.push({
      stepId: step.id,
      eggType: step.eggType,
      visitNumber: step.visitNumber,
      arrivalTimestamp: arrival,
      departureTimestamp: departure,
      duration,
    });

    currentTime = departure;
  }

  return timeline;
}
