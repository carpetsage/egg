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
 * K1 Shift Strategy:
 * 1. Shift to Kindness.
 * 2. Buy minimum vehicles to get shipping ≥ lay rate.
 * 3. Buy largest affordable vehicles/trains with remaining time (≤ 30 min total).
 */
export function runK1(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number = 1800
): ShiftResult {
  // console.log('--- Starting K1 Shift Simulation ---');
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const getAbsTime = () => context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0) + elapsedSeconds;

  const advanceTime = (seconds: number) => {
    if (seconds <= 0) return;
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds });
    currentState = applyAction(currentState, waitAction);
    // applyAction doesn't update bankValue for wait actions, so we credit earnings manually
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
    // Use count of vehicles of THIS type currently owned to determine price step
    const countBefore = currentState.vehicles.filter(v => v.vehicleId === vehicleId).length;
    const price = getDiscountedVehiclePrice(vehicleId, countBefore, getModifiers(), isResearchSaleActive(getAbsTime()));

    if (currentSnap.offlineEarnings <= 0) return false;
    const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);
    if (elapsedSeconds + timeToSave > timeLimit) return false;

    advanceTime(timeToSave);
    const action = createSimAction('buy_vehicle', { slotIndex, vehicleId }, price);
    currentState = applyAction(currentState, action);
    actions.push(action as unknown as any);
    // console.log(`  Bought Vehicle ID ${vehicleId} in slot ${slotIndex} (waited ${timeToSave.toFixed(1)}s, cost ${formatNumber(price)})`);
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
    if (elapsedSeconds + timeToSave > timeLimit) return false;

    advanceTime(timeToSave);
    const action = createSimAction('buy_train_car', { 
      slotIndex, 
      fromLength: vehicle.trainLength, 
      toLength: vehicle.trainLength + 1 
    }, price);
    currentState = applyAction(currentState, action);
    actions.push(action as unknown as any);
    // console.log(`  Bought Train Car for slot ${slotIndex} (waited ${timeToSave.toFixed(1)}s, cost ${formatNumber(price)})`);
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
  // console.log(`  Shifted to Kindness. Cost: ${formatNumber(sCost, 3)} SE`);

  // Phase 1: Buy the most expensive vehicle affordable in <10s until shipping ≥ lay rate
  // console.log('Phase 1: Getting shipping ≥ lay rate...');
  let phase1Success = false;
  while (elapsedSeconds < timeLimit) {
    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    if (snapshot.shippingCapacity >= snapshot.layRate) {
      // console.log(`  Phase 1 complete: shipping ${formatNumber(snapshot.shippingCapacity)}/s ≥ lay rate ${formatNumber(snapshot.layRate)}/s`);
      phase1Success = true;
      break;
    }

    // Find first empty slot
    const maxSlots = calculateMaxVehicleSlots(currentState.researchLevels);
    let targetSlot = -1;
    for (let i = 0; i < maxSlots; i++) {
      if (!currentState.vehicles[i] || currentState.vehicles[i].vehicleId === null) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot === -1) {
      // All slots full but still under lay rate — nothing Phase 1 can do
      // console.log('  Phase 1: All slots full but shipping still under lay rate.');
      break;
    }

    // Buy the most expensive vehicle we can afford in <10s
    let bought = false;
    for (let vid = 11; vid >= 0; vid--) {
      const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      if (currentSnap.offlineEarnings <= 0) break;
      const countBefore = currentState.vehicles.filter(v => v.vehicleId === vid).length;
      const price = getDiscountedVehiclePrice(vid, countBefore, getModifiers(), isResearchSaleActive(getAbsTime()));
      const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);

      if (timeToSave < 10) {
        // console.log(`  Phase 1: Buying vehicle ID ${vid} for slot ${targetSlot} (${timeToSave.toFixed(1)}s to afford)`);
        if (buyVehicle(targetSlot, vid)) {
          bought = true;
          break;
        }
      }
    }

    if (!bought) {
      // Nothing affordable in <10s, just buy the cheapest thing (Trike) and move on
      // console.log(`  Phase 1: Nothing affordable in <10s, buying Trike for slot ${targetSlot}`);
      if (!buyVehicle(targetSlot, 0)) break;
    }
  }

  if (!phase1Success) {
    // console.log('  Phase 1: Could not reach shipping ≥ lay rate.');
  }

  // Phase 2: Maximize shipping capacity
  // console.log('Phase 2: Maximizing shipping capacity...');
  const maxSlots = calculateMaxVehicleSlots(currentState.researchLevels);
  const maxLen = calculateMaxTrainLength(currentState.researchLevels);

  // Phase 2A: Buy Hyperloop Trains and cars until we can't afford them
  // console.log('  Phase 2A: Hyperloop Trains and cars...');
  let hyperloopsDone = false;
  while (elapsedSeconds < timeLimit && !hyperloopsDone) {
    // Find a slot that needs a Hyperloop upgrade, or an existing Hyperloop that needs cars
    let bestAction: { type: 'buy_hyperloop' | 'buy_car'; slot: number; timeToSave: number } | null = null;

    for (let i = 0; i < maxSlots; i++) {
      const vehicle = currentState.vehicles[i];
      const vid = vehicle?.vehicleId ?? -1;

      if (vid !== 11) {
        // This slot doesn't have a Hyperloop — consider buying one
        const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
        if (currentSnap.offlineEarnings <= 0) continue;
        const countBefore = currentState.vehicles.filter(v => v.vehicleId === 11).length;
        const price = getDiscountedVehiclePrice(11, countBefore, getModifiers(), isResearchSaleActive(getAbsTime()));
        const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);
        if (elapsedSeconds + timeToSave <= timeLimit) {
          if (!bestAction || timeToSave < bestAction.timeToSave) {
            bestAction = { type: 'buy_hyperloop', slot: i, timeToSave };
          }
        }
      } else if ((vehicle?.trainLength || 0) < maxLen) {
        // This slot has a Hyperloop — consider adding a car
        const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
        if (currentSnap.offlineEarnings <= 0) continue;
        const price = getDiscountedTrainCarPrice(vehicle!.trainLength, getModifiers(), isResearchSaleActive(getAbsTime()));
        const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);
        if (elapsedSeconds + timeToSave <= timeLimit) {
          if (!bestAction || timeToSave < bestAction.timeToSave) {
            bestAction = { type: 'buy_car', slot: i, timeToSave };
          }
        }
      }
    }

    if (bestAction) {
      // console.log(`  Phase 2A: ${bestAction.type} for slot ${bestAction.slot} (${bestAction.timeToSave.toFixed(1)}s to afford)`);
      if (bestAction.type === 'buy_hyperloop') {
        if (!buyVehicle(bestAction.slot, 11)) { hyperloopsDone = true; }
      } else {
        if (!buyTrainCar(bestAction.slot)) { hyperloopsDone = true; }
      }
    } else {
      // console.log('  Phase 2A: No more affordable Hyperloop upgrades.');
      hyperloopsDone = true;
    }
  }

  // Phase 2B: Buy Quantum Transporters for any remaining non-Hyperloop slots
  // console.log('  Phase 2B: Quantum Transporters...');
  for (let i = 0; i < maxSlots && elapsedSeconds < timeLimit; i++) {
    const vid = currentState.vehicles[i]?.vehicleId ?? -1;
    if (vid < 10) {
      // console.log(`  Phase 2B: Buying Quantum Transporter for slot ${i}`);
      if (!buyVehicle(i, 10)) {
        // console.log(`  Phase 2B: Can't afford Quantum Transporter for slot ${i}, stopping.`);
        break;
      }
    }
  }

  // Phase 2C: Fill any remaining empty slots with the best affordable vehicle
  // console.log('  Phase 2C: Filling remaining empty slots...');
  for (let i = 0; i < maxSlots && elapsedSeconds < timeLimit; i++) {
    if (!currentState.vehicles[i] || currentState.vehicles[i].vehicleId === null) {
      // Find best affordable vehicle for this slot
      let bought = false;
      for (let vid = 11; vid >= 0; vid--) {
        const currentSnap = computeSnapshot(currentState, context, { skipGrowth: true });
        if (currentSnap.offlineEarnings <= 0) break;
        const countBefore = currentState.vehicles.filter(v => v.vehicleId === vid).length;
        const price = getDiscountedVehiclePrice(vid, countBefore, getModifiers(), isResearchSaleActive(getAbsTime()));
        const timeToSave = Math.max(0, (price - currentSnap.bankValue) / currentSnap.offlineEarnings);
        if (elapsedSeconds + timeToSave <= timeLimit) {
          // console.log(`  Phase 2C: Buying vehicle ID ${vid} for empty slot ${i}`);
          if (buyVehicle(i, vid)) { bought = true; break; }
        }
      }
      if (!bought) {
        // console.log(`  Phase 2C: Can't afford any vehicle for slot ${i}, stopping.`);
        break;
      }
    }
  }

  // console.log(`K1 Finished: ${actions.filter(a => a.type === 'buy_vehicle' || a.type === 'buy_train_car').length} vehicle actions, total time ${elapsedSeconds.toFixed(1)}s`);

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
