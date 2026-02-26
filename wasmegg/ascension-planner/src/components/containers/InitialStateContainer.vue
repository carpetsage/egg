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
    :fuel-amounts="store.initialFuelAmounts"
    :tank-capacity="fuelTankStore.tankCapacity"
    :eggs-delivered="store.initialEggsDelivered"
    :te-earned="store.initialTeEarned"
    :te-pending="store.initialTePending"
    :total-te="initialTotalTe"
    :can-continue="!!store.currentFarmState"
    :current-egg-name="currentEggName"
    :soul-eggs="store.soulEggs"
    :assume-double-earnings="store.assumeDoubleEarnings"
    :artifact-sets="store.artifactSets"
    :active-artifact-set="store.activeArtifactSet"
    :colleggtible-tiers="store.colleggtibleTiers"
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
    @include-pending-te="handleIncludePendingTe"
    @continue-ascension="handleContinueAscension"
    @set-soul-eggs="handleSetSoulEggs"
    @set-assume-double-earnings="handleSetAssumeDoubleEarnings"
    @save-current-to-set="handleSaveCurrentToSet"
    @update-artifact-set="handleUpdateArtifactSet"
    @set-active-artifact-set="handleSetActiveArtifactSet"
    @set-colleggtible-tier="handleSetColleggtibleTier"
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
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useSilosStore } from '@/stores/silos';
import InitialStateDisplay from '@/components/presenters/InitialStateDisplay.vue';
import type { VirtueEgg, Action } from '@/types';
import { VIRTUE_EGGS, VIRTUE_EGG_NAMES } from '@/types';

const store = useInitialStateStore();
const virtueStore = useVirtueStore();
const actionsStore = useActionsStore();
const fuelTankStore = useFuelTankStore();
const truthEggsStore = useTruthEggsStore();
const commonResearchStore = useCommonResearchStore();
const habCapacityStore = useHabCapacityStore();
const shippingCapacityStore = useShippingCapacityStore();
const silosStore = useSilosStore();

const startAction = computed(() =>
  actionsStore.getStartAction() as Action<'start_ascension'> | undefined
);

import { computeSnapshot } from '@/engine/compute';
import { getSimulationContext, createBaseEngineState } from '@/engine/adapter';

function updateInitialSnapshotAndRecalculate() {
  // Recompute the pure initial snapshot from base conditions (ignoring simulated head state)
  const context = getSimulationContext();
  const baseState = createBaseEngineState(null);
  const initialSnapshot = computeSnapshot(baseState, context);
  
  actionsStore.setInitialSnapshot(initialSnapshot);
  // Recalculate all history
  actionsStore.recalculateAll();
}

const initialTotalTe = computed(() =>
  Object.values(store.initialTeEarned).reduce((sum, val) => sum + val, 0)
);

const currentEggName = computed(() => {
  if (!store.currentFarmState) return '';
  const egg = VIRTUE_EGGS[store.currentFarmState.eggType - 50];
  return VIRTUE_EGG_NAMES[egg] || '';
});

async function handleContinueAscension() {
  await actionsStore.continueFromBackup();
}

function handleSetEpicResearchLevel(id: string, level: number) {
  store.setEpicResearchLevel(id, level);
  updateInitialSnapshotAndRecalculate();
}

function handleSetColleggtibleTier(id: string, tierIndex: number) {
  store.setColleggtibleTier(id, tierIndex);
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
  store.setInitialFuelAmount(egg, amount);
  updateInitialSnapshotAndRecalculate();
}

function handleSetEggsDelivered(egg: VirtueEgg, amount: number) {
  // We still use truthEggsStore for the sync logic (detecting TE thresholds)
  // but we must store the resulting initial values back into InitialStateStore
  truthEggsStore.$patch(state => {
    state.eggsDelivered = { ...store.initialEggsDelivered };
    state.teEarned = { ...store.initialTeEarned };
  });
  
  truthEggsStore.setEggsDeliveredWithSync(egg, amount);

  // Sync back to InitialStateStore
  for (const e of VIRTUE_EGGS) {
    store.setInitialEggsDelivered(e, truthEggsStore.eggsDelivered[e]);
    store.setInitialTeEarned(e, truthEggsStore.teEarned[e]);
  }

  // Also update the virtue store's total TE and initial TE baseline
  virtueStore.setTE(truthEggsStore.totalTE);
  virtueStore.setInitialTE(truthEggsStore.totalTE);

  updateInitialSnapshotAndRecalculate();
}

function handleSetTEEarned(egg: VirtueEgg, count: number) {
  truthEggsStore.$patch(state => {
    state.eggsDelivered = { ...store.initialEggsDelivered };
    state.teEarned = { ...store.initialTeEarned };
  });

  truthEggsStore.setTEEarnedWithSync(egg, count);

  // Sync back to InitialStateStore
  for (const e of VIRTUE_EGGS) {
    store.setInitialEggsDelivered(e, truthEggsStore.eggsDelivered[e]);
    store.setInitialTeEarned(e, truthEggsStore.teEarned[e]);
  }

  // Also update the virtue store's total TE and initial TE baseline
  virtueStore.setTE(truthEggsStore.totalTE);
  virtueStore.setInitialTE(truthEggsStore.totalTE);

  updateInitialSnapshotAndRecalculate();
}

function handleIncludePendingTe() {
  // Initialize truthEggsStore with current state for sync logic
  truthEggsStore.$patch(state => {
    state.eggsDelivered = { ...store.initialEggsDelivered };
    state.teEarned = { ...store.initialTeEarned };
  });

  let changed = false;

  for (const egg of VIRTUE_EGGS) {
    const pending = store.initialTePending[egg];
    if (pending > 0) {
      const currentEarned = store.initialTeEarned[egg];
      const newTotal = Math.min(98, currentEarned + pending);
      
      // Update via truthEggsStore to handle sync logic
      truthEggsStore.setTEEarned(egg, newTotal);
      
      // Clear pending
      store.setInitialTePending(egg, 0);
      changed = true;
    }
  }

  if (changed) {
    // Sync back to InitialStateStore
    for (const e of VIRTUE_EGGS) {
      store.setInitialEggsDelivered(e, truthEggsStore.eggsDelivered[e]);
      store.setInitialTeEarned(e, truthEggsStore.teEarned[e]);
    }

    // Update virtue store
    virtueStore.setTE(truthEggsStore.totalTE);
    virtueStore.setInitialTE(truthEggsStore.totalTE);

    updateInitialSnapshotAndRecalculate();
  }
}

function handleSetTE(te: number) {
  virtueStore.setTE(te);
  virtueStore.setInitialTE(te);
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

function handleSetSoulEggs(count: number) {
  store.setSoulEggs(count);
  updateInitialSnapshotAndRecalculate();
}

function handleSetAssumeDoubleEarnings(enabled: boolean) {
  store.setAssumeDoubleEarnings(enabled);
  updateInitialSnapshotAndRecalculate();
}

function handleSaveCurrentToSet(setName: any) {
  store.saveCurrentToSet(setName);
  updateInitialSnapshotAndRecalculate();
}

function handleUpdateArtifactSet(setName: any, loadout: any[]) {
  store.updateArtifactSet(setName, loadout);
  updateInitialSnapshotAndRecalculate();
}

function handleSetActiveArtifactSet(setName: any) {
  store.setActiveArtifactSet(setName);
  updateInitialSnapshotAndRecalculate();
}
</script>
