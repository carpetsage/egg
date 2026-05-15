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
  buildPhaseEnd: number
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
    currentState = { ...currentState, bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * seconds };
    actions.push(waitAction as unknown as any);
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
    actions.push(action as unknown as any);
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
    actions.push(action as unknown as any);
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
  actions.push(shiftAction as unknown as any);

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
  (currentState as any).maxELR = peakELR;

  // Attach peakELR to the shift action (the first action) so the UI summary can find it easily
  if (actions.length > 0 && actions[0].type === 'shift') {
    actions[0].payload.peakELR = peakELR;
  }

  // 4. Wait until buildPhaseEnd
  const absTimeAfterPurchases = getAbsTime();
  const waitDuration = Math.max(0, buildPhaseEnd - absTimeAfterPurchases);
  
  if (waitDuration > 0) {
    const teResult = computeTEEarned(
      currentState.eggsDelivered[currentState.currentEgg] || 0,
      peakELR,
      waitDuration
    );
    
    advanceTime(waitDuration, { 
      isTEWait: true, 
      teEarned: teResult.teEarned,
      finalEggsDelivered: teResult.finalEggsDelivered 
    });

    // Update state
    currentState.eggsDelivered[currentState.currentEgg] = teResult.finalEggsDelivered;
    currentState.teEarned[currentState.currentEgg] = (currentState.teEarned[currentState.currentEgg] || 0) + teResult.teEarned;
    currentState.te += teResult.teEarned;
  }

  console.log(`K3 Finished: Peak ELR ${formatNumber(peakELR * 3600, 3)}/hr. TE earned in wait: ${currentState.teEarned[currentState.currentEgg]}`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
