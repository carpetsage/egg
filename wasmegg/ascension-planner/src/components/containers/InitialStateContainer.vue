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
    @set-epic-research-level="handleSetEpicResearchLevel"
    @update:artifact-loadout="handleArtifactLoadout"
    @set-initial-egg="handleSetInitialEgg"
    @set-te="handleSetTE"
    @set-initial-shift-count="handleSetInitialShiftCount"
    @set-ascension-date="handleSetAscensionDate"
    @set-ascension-time="handleSetAscensionTime"
    @set-ascension-timezone="handleSetAscensionTimezone"
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

function updateInitialSnapshotAndRecalculate() {
  // Recompute and update the initial snapshot
  const newSnapshot = computeCurrentSnapshot();
  actionsStore.setInitialSnapshot(newSnapshot);
  // Recalculate all history
  actionsStore.recalculateAll();
}

function handleSetEpicResearchLevel(id: string, level: number) {
  store.setEpicResearchLevel(id, level);
  updateInitialSnapshotAndRecalculate();
}

function handleArtifactLoadout(loadout: any[]) {
  store.setArtifactLoadout(loadout);
  updateInitialSnapshotAndRecalculate();
}

function handleSetInitialEgg(egg: VirtueEgg) {
  // Update the actions store
  actionsStore.setInitialEgg(egg);

  // Update the virtue store's current egg
  virtueStore.setCurrentEgg(egg);

  updateInitialSnapshotAndRecalculate();
}

function handleSetTankLevel(level: number) {
  fuelTankStore.setTankLevel(level);
  updateInitialSnapshotAndRecalculate();
}

function handleSetFuelAmount(egg: VirtueEgg, amount: number) {
  fuelTankStore.setFuelAmount(egg, amount);
  updateInitialSnapshotAndRecalculate();
}

function handleSetEggsDelivered(egg: VirtueEgg, amount: number) {
  // Use sync version to auto-update TE based on thresholds
  truthEggsStore.setEggsDeliveredWithSync(egg, amount);

  // Also update the virtue store's total TE
  virtueStore.setTE(truthEggsStore.totalTE);

  updateInitialSnapshotAndRecalculate();
}

function handleSetTEEarned(egg: VirtueEgg, count: number) {
  // Use sync version to auto-update eggs delivered to minimum threshold
  truthEggsStore.setTEEarnedWithSync(egg, count);

  // Also update the virtue store's total TE
  virtueStore.setTE(truthEggsStore.totalTE);

  updateInitialSnapshotAndRecalculate();
}

function handleSetTE(te: number) {
  virtueStore.setTE(te);
  updateInitialSnapshotAndRecalculate();
}

function handleSetInitialShiftCount(count: number) {
  virtueStore.setInitialShiftCount(count);
  updateInitialSnapshotAndRecalculate();
}

function handleSetAscensionDate(date: string) {
  virtueStore.setAscensionDate(date);
  updateInitialSnapshotAndRecalculate();
}

function handleSetAscensionTime(time: string) {
  virtueStore.setAscensionTime(time);
  updateInitialSnapshotAndRecalculate();
}

function handleSetAscensionTimezone(timezone: string) {
  virtueStore.setAscensionTimezone(timezone);
  updateInitialSnapshotAndRecalculate();
}
</script>
