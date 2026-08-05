import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import { TE_BREAKPOINTS, countTEThresholdsPassed, getThresholdForTE } from '@/lib/truthEggs';
import { computeTEEarned, timeToEarnTE } from '../te-thresholds';
import type { VirtueEgg } from '@/types/actions/virtue';

/**
 * Distributes a target total TE across the 5 virtue eggs in a way that
 * minimizes total time, by greedily assigning each next TE to whichever egg
 * needs the fewest additional eggs delivered to cross its next threshold.
 *
 * Mirrors `BulkWaitForTEActions.vue`'s `calculateGreedyGains`: cost is based on
 * each egg's actual `eggsDelivered` (which may sit strictly between two TE
 * thresholds), not just its current TE count — comparing raw threshold values
 * would ignore partial progress and effectively just equalize TE counts.
 *
 * `runAscension` calls this fresh before every TE-earning shift (K3, C4, I2, R2, H2), since each
 * shift's actual result can drift from its previously-assigned target (e.g. K3 may overshoot its
 * kindness target because it also has to wait out the build-phase sale window). Eggs whose shift
 * has already run this ascension are "locked in" — nothing will revisit them — so they must be
 * excluded from the greedy candidate pool via `lockedEggs`, or this function can end up assigning
 * the marginal TE to an egg that will never actually earn it, silently undershooting the target.
 *
 * @param eggsDelivered - Map of lifetime eggs delivered per egg
 * @param targetTotalTE - Goal total TE for the entire ascension
 * @param lockedEggs - Eggs whose TE-earning shift has already run this ascension and won't run
 *   again; excluded from receiving any of the marginal TE being distributed here.
 * @returns Map of target TE per egg
 */
export function distributeTargetTE(
  eggsDelivered: Record<VirtueEgg, number>,
  targetTotalTE: number,
  lockedEggs: VirtueEgg[] = []
): Record<VirtueEgg, number> {
  const eggs: VirtueEgg[] = ['curiosity', 'integrity', 'resilience', 'humility', 'kindness'];
  const targets: Record<VirtueEgg, number> = {} as Record<VirtueEgg, number>;
  const delivered: Record<VirtueEgg, number> = {} as Record<VirtueEgg, number>;

  for (const egg of eggs) {
    delivered[egg] = eggsDelivered[egg] || 0;
    targets[egg] = countTEThresholdsPassed(delivered[egg]);
  }

  let currentTotal = Object.values(targets).reduce((a, b) => a + b, 0);

  while (currentTotal < targetTotalTE) {
    // Find the egg where the next TE needs the fewest additional eggs delivered,
    // considering only eggs that can still actually be acted on this ascension.
    let bestEgg: VirtueEgg | null = null;
    let bestCost = Infinity;

    for (const egg of eggs) {
      if (lockedEggs.includes(egg)) continue;

      const currentTE = targets[egg];
      if (currentTE >= TE_BREAKPOINTS.length) continue;

      const nextThreshold = TE_BREAKPOINTS[currentTE];
      const cost = Math.max(0, nextThreshold - delivered[egg]);
      if (cost < bestCost) {
        bestCost = cost;
        bestEgg = egg;
      }
    }

    if (!bestEgg) break; // No unlocked egg left that can take more TE (or target > max total TE)

    targets[bestEgg]++;
    delivered[bestEgg] = TE_BREAKPOINTS[targets[bestEgg] - 1];
    currentTotal++;
  }

  return targets;
}

/**
 * Finds the maximum total TE goal that can be reached within a given time budget.
 * Uses a greedy approach similar to distributeTargetTE but constrained by time.
 *
 * @param lockedEggs - Eggs whose TE-earning shift has already run this ascension and won't run
 *   again; excluded from the candidate pool for the same reason as in `distributeTargetTE`.
 */
export function solveTEForTimeBudget(
  currentTEs: Record<VirtueEgg, number>,
  currentEggsDelivered: Record<VirtueEgg, number>,
  peakELR: number,
  timeBudgetSeconds: number,
  lockedEggs: VirtueEgg[] = []
): number {
  if (timeBudgetSeconds <= 0) return Object.values(currentTEs).reduce((a, b) => a + b, 0);
  if (peakELR <= 0) return Object.values(currentTEs).reduce((a, b) => a + b, 0);

  const targets = { ...currentTEs };
  const eggsDelivered = { ...currentEggsDelivered };
  const eggs: VirtueEgg[] = ['curiosity', 'integrity', 'resilience', 'humility', 'kindness'];
  let remainingTime = timeBudgetSeconds;

  while (remainingTime > 0) {
    let bestEgg: VirtueEgg | null = null;
    let minTime = Infinity;

    for (const egg of eggs) {
      if (lockedEggs.includes(egg)) continue;

      const currentTE = targets[egg];
      if (currentTE < TE_BREAKPOINTS.length) {
        // How long to reach the NEXT TE for this egg?
        const time = timeToEarnTE(eggsDelivered[egg] || 0, peakELR, 1);
        if (time < minTime) {
          minTime = time;
          bestEgg = egg;
        }
      }
    }

    if (!bestEgg || minTime > remainingTime) break;

    remainingTime -= minTime;
    targets[bestEgg]++;
    // Update eggsDelivered to the threshold we just hit
    eggsDelivered[bestEgg] = getThresholdForTE(targets[bestEgg]);
  }

  const finalTotal = Object.values(targets).reduce((a, b) => a + b, 0);
  return finalTotal;
}

/**
 * Runs a TE-earning shift for a specific egg.
 * Waits until the target TE for that egg is reached at peak ELR.
 */
export function runTEWaitShift(
  state: EngineState,
  context: SimulationContext,
  egg: VirtueEgg,
  targetTEForEgg: number,
  peakELR: number
): ShiftResult {
  let currentState = { ...state };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  // Skip entirely if this egg already has enough TE
  const currentTECheck = countTEThresholdsPassed(currentState.eggsDelivered[egg] || 0);
  if (targetTEForEgg <= currentTECheck) {
    return { actions: [], elapsedSeconds: 0, endState: state };
  }

  // 1. Shift to target egg if not already there
  if (currentState.currentEgg !== egg) {
    const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
    const shiftAction = createSimAction('shift', {
      fromEgg: currentState.currentEgg,
      toEgg: egg,
      newShiftCount: currentState.shiftCount + 1,
    }, sCost);
    
    currentState = applyAction(currentState, shiftAction);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    shiftAction.endState = finalSnap;
    shiftAction.totalTimeSeconds = 0;

    actions.push(shiftAction);
  }

  // 2. Wait until target TE is reached
  const currentEggsDelivered = currentState.eggsDelivered[egg] || 0;
  const currentTE = countTEThresholdsPassed(currentEggsDelivered);
  const neededTE = Math.max(0, targetTEForEgg - currentTE);

  if (neededTE > 0) {
    const waitTime = timeToEarnTE(currentEggsDelivered, peakELR, neededTE);
    if (waitTime > 0 && waitTime !== Infinity) {
      const teResult = computeTEEarned(currentEggsDelivered, peakELR, waitTime);

      const waitAction = createSimAction('wait_for_te', {
        egg,
        targetTE: currentTE + neededTE,
        teGained: teResult.teEarned,
        eggsToLay: teResult.finalEggsDelivered - currentEggsDelivered,
        timeSeconds: waitTime,
        startEggsDelivered: currentEggsDelivered,
        startTE: currentTE
      });
      
      // Update state manually because applyAction doesn't know about TE tracking or time
      currentState = applyAction(currentState, waitAction);
      const snap = computeSnapshot(currentState, context, { skipGrowth: true });
      currentState.lastStepTime = (currentState.lastStepTime || 0) + waitTime;
      currentState.bankValue += snap.offlineEarnings * waitTime;
      
      currentState.eggsDelivered = { ...currentState.eggsDelivered, [egg]: teResult.finalEggsDelivered };
      currentState.teEarned = { ...currentState.teEarned, [egg]: (currentState.teEarned[egg] || 0) + teResult.teEarned };
      currentState.te += teResult.teEarned;
      
      // Decoration
      const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      waitAction.endState = finalSnap;
      waitAction.totalTimeSeconds = waitTime;
      waitAction.bankDelta = snap.offlineEarnings * waitTime;

      actions.push(waitAction);
      elapsedSeconds += waitTime;
    }
  }

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}

export function runC4(state: EngineState, context: SimulationContext, targetTEForEgg: number = 0, peakELR: number = 0): ShiftResult {
  return runTEWaitShift(state, context, 'curiosity', targetTEForEgg, peakELR);
}

export function runI2(state: EngineState, context: SimulationContext, targetTEForEgg: number = 0, peakELR: number = 0): ShiftResult {
  return runTEWaitShift(state, context, 'integrity', targetTEForEgg, peakELR);
}

export function runR2(state: EngineState, context: SimulationContext, targetTEForEgg: number = 0, peakELR: number = 0): ShiftResult {
  return runTEWaitShift(state, context, 'resilience', targetTEForEgg, peakELR);
}

export function runH2(state: EngineState, context: SimulationContext, targetTEForEgg: number = 0, peakELR: number = 0): ShiftResult {
  return runTEWaitShift(state, context, 'humility', targetTEForEgg, peakELR);
}
