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
        assumeDoubleEarnings: initialStateStore.assumeDoubleEarnings,
    };
}

/**
 * Create the base engine state from initial conditions.
 * This represents the state BEFORE the first action (start_ascension).
 */
export function createBaseEngineState(initialSnapshot?: CalculationsSnapshot | null): EngineState {
    const virtueStore = useVirtueStore();
    const initialStateStore = useInitialStateStore();

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
            activeArtifactSet: initialSnapshot.activeArtifactSet,
            artifactSets: JSON.parse(JSON.stringify(initialSnapshot.artifactSets)),
            population: initialSnapshot.population,
            lastStepTime: initialSnapshot.lastStepTime,
            bankValue: initialSnapshot.bankValue || 0,
            activeSales: { ...initialSnapshot.activeSales },
            earningsBoost: { ...initialSnapshot.earningsBoost },
        };
    }

    // Fallback to reading from InitialStateStore.
    // IMPORTANT: We do NOT read from the live farm stores (commonResearchStore, etc.)
    // because those represent the results of the current simulation.
    // We only use the stores that hold the DEFINITION of the player (InitialStateStore, VirtueStore).

    // We always use empty defaults for the base state.
    // Farm state (research, habs, vehicles) should only be populated via a 
    // Start Ascension action if the user chooses to "Continue Ascension".
    return {
        // We always start curiosity by default; start_ascension will override this.
        currentEgg: 'curiosity',

        shiftCount: virtueStore.initialShiftCount,
        te: virtueStore.initialTE,
        soulEggs: initialStateStore.soulEggs,

        // Defaults for a new farm
        vehicles: [{ vehicleId: 0, trainLength: 1 }], // Default Trike
        habIds: [0, null, null, null], // Default Coop
        researchLevels: {},
        siloCount: 1,

        artifactLoadout: initialStateStore.artifactLoadout.map(slot => ({
            artifactId: slot.artifactId,
            stones: [...slot.stones],
        })),

        // Progress state starts from what was in the backup
        fuelTankAmounts: { ...initialStateStore.initialFuelAmounts },
        eggsDelivered: { ...initialStateStore.initialEggsDelivered },
        teEarned: { ...initialStateStore.initialTeEarned },
        activeArtifactSet: initialStateStore.activeArtifactSet,
        artifactSets: JSON.parse(JSON.stringify(initialStateStore.artifactSets)),

        population: 0,
        lastStepTime: 0,
        bankValue: 0,
        activeSales: {
            research: false,
            hab: false,
            vehicle: false,
        },
        earningsBoost: {
            active: false,
            multiplier: 1,
        },
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
