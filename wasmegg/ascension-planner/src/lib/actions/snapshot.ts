/**
 * Snapshot Computation
 *
 * Captures the current calculation state from all composables.
 */

import type { CalculationsSnapshot, CalculationsFullOutputs, VehicleSlot, ResearchLevels } from '@/types';
import { useEggValue } from '@/composables/useEggValue';
import { useHabCapacity } from '@/composables/useHabCapacity';
import { useLayRate } from '@/composables/useLayRate';
import { useShippingCapacity } from '@/composables/useShippingCapacity';
import { useEffectiveLayRate } from '@/composables/useEffectiveLayRate';
import { useEarnings } from '@/composables/useEarnings';
import { useInternalHatcheryRate } from '@/composables/useInternalHatcheryRate';

import { useHabCapacityStore } from '@/stores/habCapacity';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useVirtueStore } from '@/stores/virtue';
import { useInitialStateStore } from '@/stores/initialState';
import { useSilosStore, totalAwayTime } from '@/stores/silos';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';

/**
 * Compute a CalculationsSnapshot from current store state.
 * Uses the existing composables to get all calculation outputs.
 */
export function computeCurrentSnapshot(): CalculationsSnapshot {
  // Get composable outputs
  const { output: eggValue } = useEggValue();
  const { output: habCapacity } = useHabCapacity();
  const { output: layRate } = useLayRate();
  const { output: shipping } = useShippingCapacity();
  const { output: elr } = useEffectiveLayRate();
  const { output: earnings } = useEarnings();
  const { output: ihr } = useInternalHatcheryRate();

  // Get store state for reconstruction
  const habCapacityStore = useHabCapacityStore();
  const shippingCapacityStore = useShippingCapacityStore();
  const commonResearchStore = useCommonResearchStore();
  const virtueStore = useVirtueStore();
  const initialStateStore = useInitialStateStore();
  const silosStore = useSilosStore();
  const fuelTankStore = useFuelTankStore();
  const truthEggsStore = useTruthEggsStore();

  // Calculate silo time
  const siloCapacityLevel = initialStateStore.epicResearchLevels['silo_capacity'] || 0;
  const siloTimeMinutes = totalAwayTime(silosStore.siloCount, siloCapacityLevel);

  return {
    // Key metrics
    eggValue: eggValue.value.finalValue,
    habCapacity: habCapacity.value.totalFinalCapacity,
    elr: elr.value.effectiveLayRate,
    shippingCapacity: shipping.value.totalFinalCapacity,
    layRate: layRate.value.totalRatePerSecond,
    onlineEarnings: earnings.value.onlineEarnings,
    offlineEarnings: earnings.value.offlineEarnings,
    onlineIHR: ihr.value.onlineRate,
    offlineIHR: ihr.value.offlineRate,

    // Virtue state
    currentEgg: virtueStore.currentEgg,
    shiftCount: virtueStore.shiftCount,
    te: virtueStore.te,

    // Silo state
    siloCount: silosStore.siloCount,
    siloTimeMinutes,

    // Fuel tank state
    fuelTankAmounts: { ...fuelTankStore.fuelAmounts },

    // Truth Eggs state
    eggsDelivered: { ...truthEggsStore.eggsDelivered },
    teEarned: { ...truthEggsStore.teEarned },

    // Store state for reconstruction
    vehicles: [...shippingCapacityStore.vehicles],
    habIds: [...habCapacityStore.habIds],
    researchLevels: { ...commonResearchStore.researchLevels },
    artifactLoadout: initialStateStore.artifactLoadout.map(slot => ({
      artifactId: slot.artifactId,
      stones: [...slot.stones],
    })),
  };
}

/**
 * Compute full outputs for modal display.
 * More expensive than basic snapshot - only compute when needed.
 */
export function computeFullOutputs(): CalculationsFullOutputs {
  const { output: eggValue } = useEggValue();
  const { output: habCapacity } = useHabCapacity();
  const { output: layRate } = useLayRate();
  const { output: shipping } = useShippingCapacity();
  const { output: elr } = useEffectiveLayRate();
  const { output: earnings } = useEarnings();
  const { output: ihr } = useInternalHatcheryRate();

  return {
    eggValue: eggValue.value,
    habCapacity: habCapacity.value,
    layRate: layRate.value,
    shippingCapacity: shipping.value,
    elr: elr.value,
    earnings: earnings.value,
    ihr: ihr.value,
  };
}

/**
 * Compute deltas between two snapshots.
 */
export function computeDeltas(
  before: CalculationsSnapshot,
  after: CalculationsSnapshot
): { elrDelta: number; offlineEarningsDelta: number } {
  return {
    elrDelta: after.elr - before.elr,
    offlineEarningsDelta: after.offlineEarnings - before.offlineEarnings,
  };
}

/**
 * Restore store state from a snapshot.
 * Used when replaying actions after an undo.
 */
export function restoreFromSnapshot(snapshot: CalculationsSnapshot): void {
  const habCapacityStore = useHabCapacityStore();
  const shippingCapacityStore = useShippingCapacityStore();
  const commonResearchStore = useCommonResearchStore();
  const virtueStore = useVirtueStore();
  const initialStateStore = useInitialStateStore();
  const silosStore = useSilosStore();
  const fuelTankStore = useFuelTankStore();
  const truthEggsStore = useTruthEggsStore();

  // Restore hab state
  for (let i = 0; i < snapshot.habIds.length; i++) {
    habCapacityStore.setHab(i, snapshot.habIds[i] as any);
  }

  // Restore vehicle state
  for (let i = 0; i < snapshot.vehicles.length; i++) {
    const vehicle = snapshot.vehicles[i];
    shippingCapacityStore.setVehicle(i, vehicle.vehicleId);
    if (vehicle.vehicleId === 11) {
      shippingCapacityStore.setTrainLength(i, vehicle.trainLength);
    }
  }

  // Restore research levels - first reset all to 0, then apply snapshot values
  // This handles the case where snapshot.researchLevels might be empty (e.g., start_ascension)
  commonResearchStore.resetAll();
  for (const [researchId, level] of Object.entries(snapshot.researchLevels)) {
    commonResearchStore.setResearchLevel(researchId, level);
  }

  // Restore virtue state
  virtueStore.setCurrentEgg(snapshot.currentEgg);
  virtueStore.setShiftCount(snapshot.shiftCount);
  virtueStore.setTE(snapshot.te);

  // Restore silo state
  if (snapshot.siloCount !== undefined) {
    silosStore.setSiloCount(snapshot.siloCount);
  }

  // Restore artifact loadout
  if (snapshot.artifactLoadout) {
    initialStateStore.setArtifactLoadout(snapshot.artifactLoadout.map(slot => ({
      artifactId: slot.artifactId,
      stones: [...slot.stones],
    })));
  }

  // Restore fuel tank state
  if (snapshot.fuelTankAmounts) {
    for (const [egg, amount] of Object.entries(snapshot.fuelTankAmounts)) {
      fuelTankStore.setFuelAmount(egg as any, amount);
    }
  }

  // Restore truth eggs state
  if (snapshot.eggsDelivered) {
    for (const [egg, amount] of Object.entries(snapshot.eggsDelivered)) {
      truthEggsStore.setEggsDelivered(egg as any, amount);
    }
  }
  if (snapshot.teEarned) {
    for (const [egg, count] of Object.entries(snapshot.teEarned)) {
      truthEggsStore.setTEEarned(egg as any, count);
    }
  }
}
