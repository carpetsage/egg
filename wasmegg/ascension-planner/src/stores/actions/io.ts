/**
 * @module ActionIO
 * @description Import/Export logic for Ascension Plans.
 */

import { downloadFile } from '@/utils/export';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { useNotesStore } from '@/stores/notes';
import type { VirtueEgg, Action, CalculationsSnapshot } from '@/types';

export function exportPlanData(actions: Action[], initialSnapshot?: CalculationsSnapshot, activePlanId: string | null = null) {
  const initialStateStore = useInitialStateStore();
  const virtueStore = useVirtueStore();
  const fuelTankStore = useFuelTankStore();
  const truthEggsStore = useTruthEggsStore();
  const notesStore = useNotesStore();

  const baseSoulEggs = initialSnapshot ? initialSnapshot.soulEggs : initialStateStore.soulEggs;
  const baseLoadout = initialSnapshot ? initialSnapshot.artifactLoadout : initialStateStore.artifactLoadout;
  const baseSets = initialSnapshot ? initialSnapshot.artifactSets : initialStateStore.artifactSets;
  const baseActiveSet = initialSnapshot ? initialSnapshot.activeArtifactSet : initialStateStore.activeArtifactSet;
  const baseFuelAmounts = initialSnapshot ? initialSnapshot.fuelTankAmounts : fuelTankStore.fuelAmounts;
  const baseEggsDelivered = initialSnapshot ? initialSnapshot.eggsDelivered : truthEggsStore.eggsDelivered;
  const baseTeEarned = initialSnapshot ? initialSnapshot.teEarned : truthEggsStore.teEarned;

  return {
    version: 1,
    timestamp: Date.now(),
    initialState: {
      playerId: 'EIxxxxxxxxxx',
      nickname: 'Redacted',
      lastBackupTime: 0,
      soulEggs: baseSoulEggs,
      epicResearchLevels: initialStateStore.epicResearchLevels,
      colleggtibleTiers: initialStateStore.colleggtibleTiers,
      artifactLoadout: baseLoadout,
      artifactSets: baseSets,
      activeArtifactSet: baseActiveSet,
      currentFarmState: initialStateStore.currentFarmState,
      assumeDoubleEarnings: initialStateStore.assumeDoubleEarnings,
      initialFuelAmounts: initialStateStore.initialFuelAmounts,
      initialEggsDelivered: initialStateStore.initialEggsDelivered,
      initialTeEarned: initialStateStore.initialTeEarned,
    },
    virtueState: {
      shiftCount: virtueStore.initialShiftCount,
      initialTE: virtueStore.initialTE,
      ascensionDate: virtueStore.ascensionDate,
      ascensionTime: virtueStore.ascensionTime,
      ascensionTimezone: virtueStore.ascensionTimezone,
    },
    fuelTankState: {
      tankLevel: fuelTankStore.tankLevel,
      fuelAmounts: baseFuelAmounts,
    },
    truthEggsState: {
      eggsDelivered: baseEggsDelivered,
      teEarned: baseTeEarned,
    },
    notesState: {
      notes: notesStore.notes,
    },
    actions: actions,
    activePlanId: activePlanId,
  };
}

export function exportPlanLogic(actions: Action[], initialSnapshot?: CalculationsSnapshot) {
  const exportData = exportPlanData(actions, initialSnapshot);

  // Sanitization: Ensure any internal mapping IDs or partitions are NOT in the export
  // (In this case, EIxxxxxxxxxx is already a placeholder, and we don't include storage keys)

  const jsonString = JSON.stringify(exportData, null, 2);
  const now = new Date();
  const filename = `ascension-plan-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;
  downloadFile(filename, jsonString, 'application/json');
}

export function importPlanLogic(jsonString: string) {
  const data = JSON.parse(jsonString);
  if (!data.version || !data.actions || !data.initialState) {
    throw new Error('Invalid plan file format');
  }

  const initialStateStore = useInitialStateStore();
  const virtueStore = useVirtueStore();
  const fuelTankStore = useFuelTankStore();
  const truthEggsStore = useTruthEggsStore();
  const notesStore = useNotesStore();

  initialStateStore.hydrate(data.initialState);

  if (data.virtueState) {
    virtueStore.setInitialState(data.virtueState.shiftCount || 0, data.virtueState.initialTE || 0);
    if (data.virtueState.ascensionDate) virtueStore.setAscensionDate(data.virtueState.ascensionDate);
    if (data.virtueState.ascensionTime) virtueStore.setAscensionTime(data.virtueState.ascensionTime);
    if (data.virtueState.ascensionTimezone) virtueStore.setAscensionTimezone(data.virtueState.ascensionTimezone);
  }

  if (data.fuelTankState) {
    fuelTankStore.setTankLevel(data.fuelTankState.tankLevel || 0);
    for (const [egg, amount] of Object.entries((data.fuelTankState.fuelAmounts || {}) as Record<string, number>)) {
      fuelTankStore.setFuelAmount(egg as VirtueEgg, amount);
    }
  }

  if (data.truthEggsState) {
    for (const [egg, amount] of Object.entries((data.truthEggsState.eggsDelivered || {}) as Record<string, number>)) {
      truthEggsStore.setEggsDelivered(egg as VirtueEgg, amount);
    }
    for (const [egg, count] of Object.entries((data.truthEggsState.teEarned || {}) as Record<string, number>)) {
      truthEggsStore.setTEEarned(egg as VirtueEgg, count);
    }
  }

  if (data.notesState) {
    notesStore.setNotes(data.notesState.notes || []);
  } else {
    notesStore.$reset();
  }

  return data;
}
