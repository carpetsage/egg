/**
 * @module SimulationEngine
 * @description Core simulation logic for the Actions store.
 * Handles applying actions, recalculating history, and managing batch modes.
 *
 * Simulation Flow:
 * 1. Action is triggered (UI or auto-logic).
 * 2. Previous state is captured from the last action's endState.
 * 3. `applyAction` computes state changes.
 * 4. `computeSnapshot` derives all calculated metrics (ELR, IHR, etc.).
 * 5. Deltas are computed between previous and new snapshots.
 * 6. Store is synchronized to the new snapshot.
 */

import { markRaw } from 'vue';
import type {
    Action,
    CalculationsSnapshot,
    VirtueEgg,
    StartAscensionPayload,
    ToggleSalePayload,
    ToggleEarningsBoostPayload,
    UpdateArtifactSetPayload,
} from '@/types';
import {
    createEmptySnapshot,
    generateActionId,
} from '@/types';
import { computeDeltas } from '@/lib/actions/snapshot';
import { simulateAsync } from '@/engine/simulate';
import {
    applyAction,
    computePassiveEggsDelivered,
    applyPassiveEggs,
    applyTime,
    getActionDuration,
} from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import {
    getSimulationContext,
    createBaseEngineState,
    syncStoresToSnapshot,
} from '@/engine/adapter';
import { type EngineState } from '@/engine/types';

/**
 * Create default start action.
 */
export function createDefaultStartAction(initialEgg: VirtueEgg = 'curiosity'): Action<'start_ascension'> {
    return {
        id: generateActionId(),
        index: 0,
        timestamp: Date.now(),
        type: 'start_ascension',
        payload: { initialEgg },
        cost: 0,
        elrDelta: 0,
        offlineEarningsDelta: 0,
        eggValueDelta: 0,
        habCapacityDelta: 0,
        layRateDelta: 0,
        shippingCapacityDelta: 0,
        ihrDelta: 0,
        bankDelta: 0,
        populationDelta: 0,
        totalTimeSeconds: 0,
        endState: createEmptySnapshot(),
        dependsOn: [],
        dependents: [],
    };
}

/**
 * Internal helper to calculate a single action result.
 */
export function calculateActionResult(
    action: Action,
    prevSnapshot: CalculationsSnapshot,
    prevState: EngineState // EngineState
): { newSnapshot: CalculationsSnapshot; durationSeconds: number } {
    const context = getSimulationContext();

    let newState = applyAction(prevState, action);
    const durationSeconds = getActionDuration(action, prevSnapshot);
    const passiveEggs = computePassiveEggsDelivered(action, prevSnapshot);
    newState = applyPassiveEggs(newState, passiveEggs);
    newState = applyTime(newState, durationSeconds, prevSnapshot);

    const newSnapshot = computeSnapshot(newState, context);
    return { newSnapshot, durationSeconds };
}
