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
 * minimizes total time (by aiming for equalized TE counts).
 * 
 * @param currentTEs - Map of current TE per egg
 * @param targetTotalTE - Goal total TE for the entire ascension
 * @returns Map of target TE per egg
 */
export function distributeTargetTE(
  currentTEs: Record<VirtueEgg, number>,
  targetTotalTE: number
): Record<VirtueEgg, number> {
  const targets: Record<VirtueEgg, number> = { ...currentTEs };
  const eggs: VirtueEgg[] = ['curiosity', 'integrity', 'resilience', 'humility', 'kindness'];

  let currentTotal = Object.values(targets).reduce((a, b) => a + b, 0);
  
  while (currentTotal < targetTotalTE) {
    // Find the egg where the next TE is "cheapest" (lowest threshold)
    let bestEgg: VirtueEgg | null = null;
    let minThreshold = Infinity;

    for (const egg of eggs) {
      const currentTE = targets[egg];
      if (currentTE < TE_BREAKPOINTS.length) {
        const threshold = TE_BREAKPOINTS[currentTE]; // Threshold for TE #(currentTE + 1)
        if (threshold < minThreshold) {
          minThreshold = threshold;
          bestEgg = egg;
        }
      }
    }

    if (!bestEgg) break; // Should not happen unless target > max total TE

    targets[bestEgg]++;
    currentTotal++;
  }

  return targets;
}

/**
 * Finds the maximum total TE goal that can be reached within a given time budget.
 * Uses a greedy approach similar to distributeTargetTE but constrained by time.
 */
export function solveTEForTimeBudget(
  currentTEs: Record<VirtueEgg, number>,
  currentEggsDelivered: Record<VirtueEgg, number>,
  peakELR: number,
  timeBudgetSeconds: number
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
      
      // Update state manually because applyAction doesn't know about TE tracking yet
      currentState = applyAction(currentState, waitAction);
      // Ensure bank is updated (though not strictly necessary for wait shifts)
      const snap = computeSnapshot(currentState, context, { skipGrowth: true });
      currentState.bankValue += snap.offlineEarnings * waitTime;
      
      currentState.eggsDelivered[egg] = teResult.finalEggsDelivered;
      currentState.teEarned[egg] = (currentState.teEarned[egg] || 0) + teResult.teEarned;
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

export function runC4(state: EngineState, context: SimulationContext, targetTEForEgg: number, peakELR: number): ShiftResult {
  return runTEWaitShift(state, context, 'curiosity', targetTEForEgg, peakELR);
}

export function runI2(state: EngineState, context: SimulationContext, targetTEForEgg: number, peakELR: number): ShiftResult {
  return runTEWaitShift(state, context, 'integrity', targetTEForEgg, peakELR);
}

export function runR2(state: EngineState, context: SimulationContext, targetTEForEgg: number, peakELR: number): ShiftResult {
  return runTEWaitShift(state, context, 'resilience', targetTEForEgg, peakELR);
}

export function runH2(state: EngineState, context: SimulationContext, targetTEForEgg: number, peakELR: number): ShiftResult {
  return runTEWaitShift(state, context, 'humility', targetTEForEgg, peakELR);
}
