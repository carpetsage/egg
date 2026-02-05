<template>
  <InitialStateDisplay
    :has-data="store.hasData"
    :nickname="store.nickname"
    :last-backup-time="store.lastBackupTime"
    :epic-research-levels="store.epicResearchLevels"
    :artifact-loadout="store.artifactLoadout"
    :initial-shift-count="virtueStore.initialShiftCount"
    :initial-egg="startAction?.payload.initialEgg ?? 'curiosity'"
    :te="virtueStore.te"
    :ascension-date="virtueStore.ascensionDate"
    :ascension-time="virtueStore.ascensionTime"
    :ascension-timezone="virtueStore.ascensionTimezone"
    :tank-level="fuelTankStore.tankLevel"
    :fuel-amounts="fuelTankStore.fuelAmounts"
    :tank-capacity="fuelTankStore.tankCapacity"
    :eggs-delivered="truthEggsStore.eggsDelivered"
    :te-earned="truthEggsStore.teEarned"
    :total-te="truthEggsStore.totalTE"
    @set-epic-research-level="store.setEpicResearchLevel"
    @update:artifact-loadout="store.setArtifactLoadout"
    @set-initial-egg="handleSetInitialEgg"
    @set-te="virtueStore.setTE"
    @set-initial-shift-count="virtueStore.setInitialShiftCount"
    @set-ascension-date="virtueStore.setAscensionDate"
    @set-ascension-time="virtueStore.setAscensionTime"
    @set-ascension-timezone="virtueStore.setAscensionTimezone"
    @set-tank-level="handleSetTankLevel"
    @set-fuel-amount="handleSetFuelAmount"
    @set-eggs-delivered="handleSetEggsDelivered"
    @set-te-earned="handleSetTEEarned"
  />
</template>

<script setup lang="ts">
/**
 * Container component for Initial State.
 * Displays player info loaded from backup.
 */
import { computed } from 'vue';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { computeCurrentSnapshot } from '@/lib/actions/snapshot';
import InitialStateDisplay from '@/components/presenters/InitialStateDisplay.vue';
import type { VirtueEgg, Action } from '@/types';

const store = useInitialStateStore();
const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();

const startAction = computed(() =>
  actionsStore.getStartAction() as Action<'start_ascension'> | undefined
);

function handleSetInitialEgg(egg: VirtueEgg) {
  // Update the actions store
  actionsStore.setInitialEgg(egg);

  // Update the virtue store's current egg
  virtueStore.setCurrentEgg(egg);

  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
}

function handleSetTankLevel(level: number) {
  fuelTankStore.setTankLevel(level);

  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
}

function handleSetFuelAmount(egg: VirtueEgg, amount: number) {
  fuelTankStore.setFuelAmount(egg, amount);

  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
}

function handleSetEggsDelivered(egg: VirtueEgg, amount: number) {
  // Use sync version to auto-update TE based on thresholds
  truthEggsStore.setEggsDeliveredWithSync(egg, amount);

  // Also update the virtue store's total TE
  virtueStore.setTE(truthEggsStore.totalTE);

  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
}

function handleSetTEEarned(egg: VirtueEgg, count: number) {
  // Use sync version to auto-update eggs delivered to minimum threshold
  truthEggsStore.setTEEarnedWithSync(egg, count);

  // Also update the virtue store's total TE
  virtueStore.setTE(truthEggsStore.totalTE);

  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
}
</script>
