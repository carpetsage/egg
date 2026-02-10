import type { EngineState, SimulationContext } from './types';
import type { CalculationsSnapshot } from '@/types';
import { useInitialStateStore } from '@/stores/initialState';
import { useVirtueStore } from '@/stores/virtue';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useHabCapacityStore } from '@/stores/habCapacity';
import { useShippingCapacityStore } from '@/stores/shippingCapacity';
import { useSilosStore } from '@/stores/silos';
import { useFuelTankStore } from '@/stores/fuelTank';
import { useTruthEggsStore } from '@/stores/truthEggs';
import { createEmptySnapshot } from '@/types';
import { restoreFromSnapshot } from '@/lib/actions/snapshot';

/**
 * Get the current simulation context from Pinia stores.
 * This captures global settings like Epic Research and Colleggtibles.
 */
export function getSimulationContext(): SimulationContext {
    const initialStateStore = useInitialStateStore();
    const virtueStore = useVirtueStore();

    // Convert ascension date/time/timezone to Unix timestamp (seconds)
    const startDateTime = new Date(`${virtueStore.ascensionDate}T${virtueStore.ascensionTime}:00`);
    const ascensionStartTime = Math.floor(startDateTime.getTime() / 1000);

    return {
        epicResearchLevels: initialStateStore.epicResearchLevels,
        colleggtibleModifiers: initialStateStore.colleggtibleModifiers,
        ascensionStartTime,
    };
}

/**
 * Create the base engine state from initial conditions.
 * This represents the state BEFORE the first action (start_ascension).
 */
export function createBaseEngineState(initialSnapshot?: CalculationsSnapshot | null): EngineState {
    const virtueStore = useVirtueStore();
    const initialStateStore = useInitialStateStore();
    const silosStore = useSilosStore();
    const fuelTankStore = useFuelTankStore();
    const truthEggsStore = useTruthEggsStore();
    const habCapacityStore = useHabCapacityStore();
    const shippingCapacityStore = useShippingCapacityStore();
    const commonResearchStore = useCommonResearchStore();

    // If a specific snapshot is provided (e.g. from existing action history), use it.
    // Otherwise, read the current "base" state from the hydrated stores.
    if (initialSnapshot) {
        return {
            currentEgg: initialSnapshot.currentEgg,
            shiftCount: initialSnapshot.shiftCount,
            te: initialSnapshot.te,
            soulEggs: initialSnapshot.soulEggs,
            vehicles: [...initialSnapshot.vehicles],
            habIds: [...initialSnapshot.habIds],
            researchLevels: { ...initialSnapshot.researchLevels },
            siloCount: initialSnapshot.siloCount,
            artifactLoadout: initialSnapshot.artifactLoadout.map(slot => ({
                artifactId: slot.artifactId,
                stones: [...slot.stones],
            })),
            fuelTankAmounts: { ...initialSnapshot.fuelTankAmounts },
            eggsDelivered: { ...initialSnapshot.eggsDelivered },
            teEarned: { ...initialSnapshot.teEarned },
            population: initialSnapshot.population,
            lastStepTime: initialSnapshot.lastStepTime,
        };
    }

    // Fallback to reading from stores (used when importing plan or starting fresh)
    return {

        currentEgg: 'curiosity', // Always start at curiosity for base unless user overrides?
        // Wait, if we imported a plan that starts on Resilience, applyAction(start_ascension) will fix it.
        // But base state needs to be valid.

        shiftCount: virtueStore.initialShiftCount,
        te: virtueStore.initialTE,
        soulEggs: initialStateStore.soulEggs,

        vehicles: shippingCapacityStore.vehicles.map(v => ({ ...v })),
        habIds: [...habCapacityStore.habIds],
        researchLevels: { ...commonResearchStore.researchLevels },
        siloCount: silosStore.siloCount,

        artifactLoadout: initialStateStore.artifactLoadout.map(slot => ({
            artifactId: slot.artifactId,
            stones: [...slot.stones],
        })),

        fuelTankAmounts: { ...fuelTankStore.fuelAmounts },
        eggsDelivered: { ...truthEggsStore.eggsDelivered },
        teEarned: { ...truthEggsStore.teEarned },

        population: initialStateStore.currentFarmState?.population || 0,
        lastStepTime: initialStateStore.currentFarmState?.lastStepTime || 0,
    };
}

/**
 * Sync Pinia stores to match a calculation snapshot.
 * This allows the rest of the application (which relies on stores)
 * to reflect the state of the simulation.
 */
export function syncStoresToSnapshot(snapshot: CalculationsSnapshot): void {
    restoreFromSnapshot(snapshot);
}
