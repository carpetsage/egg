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

    return {
        epicResearchLevels: initialStateStore.epicResearchLevels,
        colleggtibleModifiers: initialStateStore.colleggtibleModifiers,
    };
}

/**
 * Create the base engine state from initial conditions.
 * This represents the state BEFORE the first action (start_ascension).
 */
export function createBaseEngineState(initialSnapshot?: CalculationsSnapshot): EngineState {
    const virtueStore = useVirtueStore();
    const initialStateStore = useInitialStateStore();

    // Use provide snapshot or current state of stores as fallback
    const base = initialSnapshot || createEmptySnapshot();

    return {
        // Virtue state starts at initial values from backup
        currentEgg: base.currentEgg || 'curiosity',
        shiftCount: base.shiftCount || virtueStore.initialShiftCount,
        te: base.te || virtueStore.initialTE,

        // Farm starts with default equipment
        // Note: index 0 is Coop and Trike.
        vehicles: base.vehicles.length > 0 ? [...base.vehicles] : [{ vehicleId: 0, trainLength: 1 }],
        habIds: base.habIds.length > 0 ? [...base.habIds] : [0, null, null, null],
        researchLevels: { ...(base.researchLevels || {}) },
        siloCount: base.siloCount || 1,

        // Artifacts from loadout
        artifactLoadout: base.artifactLoadout ?
            base.artifactLoadout.map(slot => ({
                artifactId: slot.artifactId,
                stones: [...slot.stones],
            })) :
            initialStateStore.artifactLoadout.map(slot => ({
                artifactId: slot.artifactId,
                stones: [...slot.stones],
            })),

        // Progress state from backup
        fuelTankAmounts: { ...(base.fuelTankAmounts || {}) },
        eggsDelivered: { ...(base.eggsDelivered || {}) },
        teEarned: { ...(base.teEarned || {}) },
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
