import type { Action, CalculationsSnapshot } from '@/types';
import type { EngineState, SimulationContext, SimulationResult } from './types';
import { applyAction } from './apply';
import { computeSnapshot } from './compute';
import { computeDeltas } from '@/lib/actions/snapshot';

/**
 * Simulate a list of actions to produce a timeline of states.
 * @param actions The list of actions to simulate (including start_ascension)
 * @param context Global context (epic research, colleggtibles)
 * @param baseState The specific starting state (TE, shift count, empty farm)
 * @returns The list of actions with updated endState and deltas
 */
export function simulate(
    actions: Action[],
    context: SimulationContext,
    baseState: EngineState
): Action[] {
    const results: Action[] = [];
    let previousSnapshot: CalculationsSnapshot | null = null;

    // We need a way to treat baseState as a Snapshot for delta computation of the first action.
    // However, computeDeltas expects a full CalculationsSnapshot.
    // We can compute the "base snapshot" once.
    const baseSnapshot = computeSnapshot(baseState, context);

    let currentState = baseState;
    let currentSnapshot = baseSnapshot;

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        // 1. Apply action to get new pure state
        currentState = applyAction(currentState, action);

        // 2. Compute full snapshot
        const newSnapshot = computeSnapshot(currentState, context);

        // 3. Compute deltas vs previous state
        // For the first action, we compare against baseSnapshot (or should we?)
        // In the current store, start_ascension has 0 deltas usually.
        // computeDeltas(baseSnapshot, newSnapshot) might show diffs if start_ascension changed the egg.
        const prevSnap = i === 0 ? baseSnapshot : previousSnapshot!;

        const deltas = computeDeltas(prevSnap, newSnapshot);

        // 4. Update action
        // We create a new action object to avoid mutating the input array/objects in place if possible,
        // but typically we want to update the store's action objects. 
        // Here we return new objects. The caller can replace them in the store.
        results.push({
            ...action,
            ...deltas,
            endState: newSnapshot, // Caller should markRaw this if using Vue
        });

        previousSnapshot = newSnapshot;
    }

    return results;
}
