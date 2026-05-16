import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import {
  getHabById,
  getDiscountedHabPrice,
  type HabId,
} from '../../lib/habs';
import { formatNumber } from '@/lib/format';

/**
 * I1 Shift Strategy:
 * 1. Shift to Integrity.
 * 2. Buy at least one intermediate hab to quickly increase earnings.
 * 3. Buy 4 Chicken Universe habs (ID 18).
 */
export function runI1(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number = 7200 // Giving plenty of time for 4 CUs
): ShiftResult {
  // console.log('--- Starting I1 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const advanceTime = (seconds: number) => {
    if (seconds <= 0) return;
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds });
    
    currentState = applyAction(currentState, waitAction);
    // applyAction doesn't update bankValue for wait actions, so we credit earnings manually
    currentState = { ...currentState, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
    
    // Decoration for the action store
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    waitAction.endState = finalSnap;
    waitAction.totalTimeSeconds = seconds;
    waitAction.bankDelta = snap.offlineEarnings * seconds;
    
    actions.push(waitAction);
    elapsedSeconds += seconds;
  };

  const getModifiers = () => ({
    cheaperContractorsLevel: context.epicResearchLevels['cheaper_contractors'] || 0,
    flameRetardantMultiplier: context.colleggtibleModifiers.habCost || 1,
  });

  const buyHab = (slotIndex: number, habId: number): boolean => {
    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const countBefore = currentState.habIds.filter(id => id === habId).length;
    const price = getDiscountedHabPrice(getHabById(habId as HabId), countBefore, getModifiers(), false);

    if (currentSnap.offlineEarnings <= 0) return false;
    const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);
    
    // We allow exceeding the timeLimit to buy Chicken Universes if necessary,
    // but we can have a safety check so it doesn't wait forever
    if (elapsedSeconds + timeToSave > timeLimit * 10) return false;

    advanceTime(timeToSave);
    const action = createSimAction('buy_hab', { slotIndex, habId }, price);
    currentState = applyAction(currentState, action);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;

    actions.push(action);
    return true;
  };

  // 1. Shift to Integrity
  const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
  const shiftAction = createSimAction('shift', {
    fromEgg: currentState.currentEgg,
    toEgg: 'integrity',
    newShiftCount: currentState.shiftCount + 1,
  }, sCost);
  
  currentState = applyAction(currentState, shiftAction);
  
  // Decoration
  const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = finalSnap;
  shiftAction.totalTimeSeconds = 0;

  actions.push(shiftAction);
  // console.log(`  Shifted to Integrity. Cost: ${formatNumber(sCost, 3)} SE`);

  // 2. Buy intermediate hab if needed
  // console.log('Phase 1: Intermediate Hab check...');
  const initialSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  const countCUBefore = currentState.habIds.filter(id => id === 18).length;
  const cuPrice = getDiscountedHabPrice(getHabById(18), countCUBefore, getModifiers(), false);
  
  const timeToSaveCU = initialSnap.offlineEarnings > 0 
    ? Math.max(0, (cuPrice - initialSnap.bankValue) / initialSnap.offlineEarnings) 
    : Infinity;

  if (timeToSaveCU > 10) {
    // Find the biggest hab we can buy in < 10s
    for (let hId = 17; hId >= 1; hId--) {
      const snap = computeSnapshot(currentState, context, { skipGrowth: true });
      const cBefore = currentState.habIds.filter(id => id === hId).length;
      const price = getDiscountedHabPrice(getHabById(hId as HabId), cBefore, getModifiers(), false);
      const timeToSave = snap.offlineEarnings > 0 
        ? Math.max(0, (price - snap.bankValue) / snap.offlineEarnings)
        : Infinity;
        
      if (timeToSave < 10) {
        // console.log(`  Buying intermediate hab ${hId} to boost earnings...`);
        buyHab(0, hId);
        break;
      }
    }
  }

  // 3. Buy 4 Chicken Universes
  // console.log('Phase 2: Buying 4 Chicken Universes...');
  for (let slot = 0; slot < 4; slot++) {
    if (currentState.habIds[slot] !== 18) {
      buyHab(slot, 18);
    }
  }

  // console.log(`I1 Finished: ${actions.filter(a => a.type === 'buy_hab').length} hab actions, total time ${elapsedSeconds}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
