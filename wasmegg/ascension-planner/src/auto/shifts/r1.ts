import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import { nextSiloCost, MAX_SILOS } from '../../stores/silos';
import { formatNumber } from '@/lib/format';

/**
 * R1 Shift Strategy:
 * 1. Shift to Resilience.
 * 2. Buy as many silos as possible within 1 hour.
 */
export function runR1(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number = 3600
): ShiftResult {
  // console.log('--- Starting R1 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const advanceTime = (seconds: number) => {
    if (seconds <= 0) return;
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds });
    
    currentState = applyAction(currentState, waitAction);
    // applyAction doesn't update bankValue or lastStepTime for wait actions, so we credit them manually
    currentState = { ...currentState, lastStepTime: (currentState.lastStepTime || 0) + seconds, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
    
    // Decoration for the action store
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    waitAction.endState = finalSnap;
    waitAction.totalTimeSeconds = seconds;
    waitAction.bankDelta = snap.offlineEarnings * seconds;
    
    actions.push(waitAction);
    elapsedSeconds += seconds;
  };

  // 1. Shift to Resilience
  const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
  const shiftAction = createSimAction('shift', {
    fromEgg: currentState.currentEgg,
    toEgg: 'resilience',
    newShiftCount: currentState.shiftCount + 1,
  }, sCost);
  
  currentState = applyAction(currentState, shiftAction);
  
  // Decoration
  const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = finalSnap;
  shiftAction.totalTimeSeconds = 0;

  actions.push(shiftAction);
  // console.log(`  Shifted to Resilience. Cost: ${formatNumber(sCost, 3)} SE`);

  // 2. Buy as many silos as possible within 1 hour
  // console.log('Phase 1: Buying silos...');
  while (currentState.siloCount < MAX_SILOS) {
    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const cost = nextSiloCost(currentState.siloCount);

    if (currentSnap.offlineEarnings <= 0) break;
    const timeToSave = Math.max(0, (cost - currentSnap.bankValue) / currentSnap.offlineEarnings);

    if (!Number.isFinite(timeToSave)) {
      // console.log(`  [Silo ${currentState.siloCount + 1}] Stalling: Cannot afford. Earnings: ${formatNumber(currentSnap.offlineEarnings, 3)}/s, Cost: ${formatNumber(cost, 3)}`);
      break;
    }

    if (elapsedSeconds + timeToSave > timeLimit) {
      break;
    }

    advanceTime(timeToSave);
    const action = createSimAction('buy_silo', {
      fromCount: currentState.siloCount,
      toCount: currentState.siloCount + 1,
    }, cost);
    currentState = applyAction(currentState, action);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -cost;

    actions.push(action);
    // console.log(`  [Silo ${currentState.siloCount}] BOUGHT. Total time: ${elapsedSeconds.toFixed(1)}s`);
  }

  // console.log(`R1 Finished: ${actions.filter(a => a.type === 'buy_silo').length} silo actions, total time ${elapsedSeconds}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
