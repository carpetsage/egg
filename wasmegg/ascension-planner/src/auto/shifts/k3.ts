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
import { computeRealisticELR } from '../../calculations/realisticELR';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { formatNumber } from '@/lib/format';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { computeTEEarned, timeToEarnTE } from '../te-thresholds';

/**
 * K3 Shift Strategy:
 * 1. Shift to Kindness.
 * 2. Buy any remaining vehicles/trains unlocked by C3.
 * 3. Compute peak ELR.
 * 4. Wait until buildPhaseEnd.
 */
export function runK3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,
  targetTEForEgg?: number
): ShiftResult {
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const getAbsTime = () => context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0) + elapsedSeconds;

  const advanceTime = (seconds: number, metadata?: any) => {
    if (seconds <= 0) return;
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds, ...metadata });
    
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

  // 2. Buy any remaining vehicles/trains
  const maxSlots = calculateMaxVehicleSlots(currentState.researchLevels);
  for (let slot = 0; slot < maxSlots; slot++) {
    const currentVid = currentState.vehicles[slot]?.vehicleId;
    if (currentVid !== 11) {
      if (!buyVehicle(slot, 11)) break;
    }
  }

  const maxLen = calculateMaxTrainLength(currentState.researchLevels);
  for (let slot = 0; slot < maxSlots; slot++) {
    while (true) {
      const vehicle = currentState.vehicles[slot];
      if (!vehicle || vehicle.vehicleId !== 11 || vehicle.trainLength >= maxLen) break;
      if (!buyTrainCar(slot)) break;
    }
  }

  // 3. Compute peak ELR
  const artMods = calculateArtifactModifiers(currentState.artifactLoadout);
  const elrResult = computeRealisticELR(
    currentState.researchLevels,
    artMods,
    context.epicResearchLevels,
    context.colleggtibleModifiers
  );
  
  const peakELR = elrResult.effectiveRate;
  currentState.maxELR = peakELR;

  // Attach peakELR to the shift action (the first action) so the UI summary can find it easily
  if (actions.length > 0 && actions[0].type === 'shift') {
    actions[0].payload.peakELR = peakELR;
  }

  // 4. Wait
  const absTimeAfterPurchases = getAbsTime();
  let waitDuration = Math.max(0, buildPhaseEnd - absTimeAfterPurchases);
  
  if (targetTEForEgg !== undefined) {
    const currentEggsDelivered = currentState.eggsDelivered['kindness'] || 0;
    const currentTE = countTEThresholdsPassed(currentEggsDelivered);
    const neededTE = Math.max(0, targetTEForEgg - currentTE);
    
    if (neededTE > 0) {
      const teWaitTime = timeToEarnTE(currentEggsDelivered, peakELR, neededTE);
      // We wait until buildPhaseEnd (end of sale) but extend it if more TE is needed.
      waitDuration = Math.max(waitDuration, teWaitTime);
    }
  }
  
  if (waitDuration > 0) {
    const currentEggsDelivered = currentState.eggsDelivered['kindness'] || 0;
    const currentTE = countTEThresholdsPassed(currentEggsDelivered);

    const teResult = computeTEEarned(
      currentEggsDelivered,
      peakELR,
      waitDuration
    );
    
    const waitAction = createSimAction('wait_for_te', { 
      egg: 'kindness',
      targetTE: currentTE + teResult.teEarned,
      teGained: teResult.teEarned,
      eggsToLay: teResult.finalEggsDelivered - currentEggsDelivered,
      timeSeconds: waitDuration,
      startEggsDelivered: currentEggsDelivered,
      startTE: currentTE
    });
    
    currentState = applyAction(currentState, waitAction);
    
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    currentState.bankValue += snap.offlineEarnings * waitDuration;

    currentState.eggsDelivered['kindness'] = teResult.finalEggsDelivered;
    currentState.teEarned['kindness'] = (currentState.teEarned['kindness'] || 0) + teResult.teEarned;
    currentState.te = Object.values(currentState.teEarned).reduce((a, b) => (a as number) + (b as number), 0);
    
    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    waitAction.endState = finalSnap;
    waitAction.totalTimeSeconds = waitDuration;
    waitAction.bankDelta = snap.offlineEarnings * waitDuration;

    actions.push(waitAction);
    elapsedSeconds += waitDuration;
  }

  // console.log(`K3 Finished: Peak ELR ${formatNumber(peakELR * 3600, 3)}/hr. TE earned in wait: ${currentState.teEarned[currentState.currentEgg]}`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
