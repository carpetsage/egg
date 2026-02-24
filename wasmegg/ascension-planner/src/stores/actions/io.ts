/**
 * @module ActionIO
 * @description Import/Export logic for Ascension Plans.
 */

import { downloadFile } from '@/utils/export';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import type { VirtueEgg, Action } from '@/types';

export function exportPlanLogic(actions: Action[]) {
    const initialStateStore = useInitialStateStore();
    const virtueStore = useVirtueStore();
    const fuelTankStore = useFuelTankStore();
    const truthEggsStore = useTruthEggsStore();

    const exportData = {
        version: 1,
        timestamp: Date.now(),
        initialState: {
            playerId: 'EIxxxxxxxxxx',
            nickname: 'Redacted',
            lastBackupTime: 0,
            soulEggs: initialStateStore.soulEggs,
            epicResearchLevels: initialStateStore.epicResearchLevels,
            colleggtibleTiers: initialStateStore.colleggtibleTiers,
            artifactLoadout: initialStateStore.artifactLoadout,
            artifactSets: initialStateStore.artifactSets,
            activeArtifactSet: initialStateStore.activeArtifactSet,
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
            fuelAmounts: fuelTankStore.fuelAmounts,
        },
        truthEggsState: {
            eggsDelivered: truthEggsStore.eggsDelivered,
            teEarned: truthEggsStore.teEarned,
        },
        actions: actions,
    };

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

    return data;
}
