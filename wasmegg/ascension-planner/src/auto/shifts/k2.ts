import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import {
  getDiscountedVehiclePrice,
  getDiscountedTrainCarPrice,
} from '../../lib/vehicles';
import { isResearchSaleActive } from '../calendar';
import { calculateMaxVehicleSlots, calculateMaxTrainLength } from '../../calculations/shippingCapacity';
import { formatNumber } from '@/lib/format';

/**
 * K2 Shift Strategy:
 * 1. Shift to Kindness.
 * 2. Max all vehicle slots with best vehicles (Hyperloops, ID 11).
 * 3. Max train lengths.
 */
export function runK2(
  startState: EngineState,
  context: SimulationContext
): ShiftResult {
  // console.log('--- Starting K2 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const getAbsTime = () => context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0) + elapsedSeconds;

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

  const getModifiers = () => ({
    bustUnionsLevel: context.epicResearchLevels['cheaper_vehicles'] || 0,
    lithiumMultiplier: context.colleggtibleModifiers.vehicleCost || 1,
  });

  const buyVehicle = (slotIndex: number, vehicleId: number): boolean => {
    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const countBefore = currentState.vehicles.filter(v => v?.vehicleId === vehicleId).length;
    const price = getDiscountedVehiclePrice(vehicleId, countBefore, getModifiers(), isResearchSaleActive(getAbsTime()));

    if (currentSnap.offlineEarnings <= 0) return false;
    const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);

    advanceTime(timeToSave);
    const action = createSimAction('buy_vehicle', { slotIndex, vehicleId }, price);
    currentState = applyAction(currentState, action);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;

    actions.push(action);
    return true;
  };

  const buyTrainCar = (slotIndex: number): boolean => {
    const vehicle = currentState.vehicles[slotIndex];
    if (!vehicle || vehicle.vehicleId !== 11) return false;
    const maxLen = calculateMaxTrainLength(currentState.researchLevels);
    if (vehicle.trainLength >= maxLen) return false;

    const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    const price = getDiscountedTrainCarPrice(vehicle.trainLength, getModifiers(), isResearchSaleActive(getAbsTime()));

    if (currentSnap.offlineEarnings <= 0) return false;
    const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);

    advanceTime(timeToSave);
    const action = createSimAction('buy_train_car', { 
      slotIndex, 
      fromLength: vehicle.trainLength, 
      toLength: vehicle.trainLength + 1 
    }, price);
    currentState = applyAction(currentState, action);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    action.endState = finalSnap;
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;

    actions.push(action);
    return true;
  };

  // 1. Shift to Kindness
  const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
  const shiftAction = createSimAction('shift', {
    fromEgg: currentState.currentEgg,
    toEgg: 'kindness',
    newShiftCount: currentState.shiftCount + 1,
  }, sCost);
  
  currentState = applyAction(currentState, shiftAction);
  
  // Decoration
  const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = finalSnap;
  shiftAction.totalTimeSeconds = 0;

  actions.push(shiftAction);
  // console.log(`  Shifted to Kindness. Cost: ${formatNumber(sCost, 3)} SE`);

  // 2. Max all vehicle slots with Hyperloop (ID 11)
  // console.log('Phase 1: Buying Hyperloop for all slots...');
  const maxSlots = calculateMaxVehicleSlots(currentState.researchLevels);
  for (let slot = 0; slot < maxSlots; slot++) {
    const currentVid = currentState.vehicles[slot]?.vehicleId;
    if (currentVid !== 11) {
      if (!buyVehicle(slot, 11)) {
         break;
      }
    }
  }

  // 3. Max train lengths
  // console.log('Phase 2: Maxing train lengths...');
  const maxLen = calculateMaxTrainLength(currentState.researchLevels);
  for (let slot = 0; slot < maxSlots; slot++) {
    while (true) {
      const vehicle = currentState.vehicles[slot];
      if (!vehicle || vehicle.vehicleId !== 11 || vehicle.trainLength >= maxLen) {
        break;
      }
      if (!buyTrainCar(slot)) {
        break;
      }
    }
  }

  // console.log(`K2 Finished: ${actions.filter(a => a.type === 'buy_vehicle' || a.type === 'buy_train_car').length} vehicle actions, total time ${elapsedSeconds}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
