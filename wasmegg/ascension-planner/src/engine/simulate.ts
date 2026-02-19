import type { Action, CalculationsSnapshot } from '@/types';
import type { EngineState, SimulationContext, SimulationResult } from './types';
import { applyAction, computePassiveEggsDelivered, applyPassiveEggs, getActionDuration, refreshActionPayload } from './apply';
import { computeSnapshot } from './compute';
import { computeDeltas } from '@/lib/actions/snapshot';

/**
 * Simulate a list of actions to produce a timeline of states.
 * @param actions The list of actions to simulate (including start_ascension)
 * @param context Global context (epic research, colleggtibles)
 * @param baseState The specific starting state (TE, shift count, empty farm)
 * @returns The list of actions with updated endState and deltas
 */
/**
 * Simulate a list of actions to produce a timeline of states.
 * @param actions The list of actions to simulate (including start_ascension)
 * @param context Global context (epic research, colleggtibles)
 * @param baseState The specific starting state (TE, shift count, empty farm)
 * @param startIndex The index offset for the first action in the list (default 0)
 * @returns The list of actions with updated endState and deltas
 */
export function simulate(
    actions: Action[],
    context: SimulationContext,
    baseState: EngineState,
    startIndex: number = 0
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
        let action = actions[i];
        const actualIndex = startIndex + i;

        // 0. Refresh dynamic payloads (e.g. wait_for_te duration based on new ELR)
        action = refreshActionPayload(action, currentSnapshot);

        // 1. Apply action to get new pure state
        currentState = applyAction(currentState, action);

        // 1b. Add passively delivered eggs during this action's duration
        // Uses the PREVIOUS snapshot's ELR (eggs are shipped at the old rate while saving for the action)
        const passiveEggs = computePassiveEggsDelivered(action, currentSnapshot);
        currentState = applyPassiveEggs(currentState, passiveEggs);

        // 2. Compute full snapshot
        const newSnapshot = computeSnapshot(currentState, context);

        // 3. Compute deltas vs previous state
        // For the first action, we compare against baseSnapshot (or should we?)
        // In the current store, start_ascension has 0 deltas usually.
        // computeDeltas(baseSnapshot, newSnapshot) might show diffs if start_ascension changed the egg.
        const prevSnap = i === 0 ? baseSnapshot : previousSnapshot!;

        const deltas = computeDeltas(prevSnap, newSnapshot);

        // 3b. Calculate duration
        const durationSeconds = getActionDuration(action, prevSnap);

        // 4. Update action with new results and correct index
        results.push({
            ...action,
            index: actualIndex,
            ...deltas,
            totalTimeSeconds: durationSeconds,
            endState: newSnapshot, // Caller should markRaw this if using Vue
        });

        // 5. Update currentState for the next iteration.
        // This is CRITICAL: simulation must propagate the computed state 
        // (population, egg delivery, etc.) to the next action or else 
        // subsequent actions will start from stale states.
        currentState = {
            ...currentState,
            population: newSnapshot.population,
            lastStepTime: newSnapshot.lastStepTime,
            // Also ensure cumulative lifecycle eggs/fuel are preserved from computeSnapshot if they changed
            eggsDelivered: { ...newSnapshot.eggsDelivered },
            fuelTankAmounts: { ...newSnapshot.fuelTankAmounts },
        };

        previousSnapshot = newSnapshot;
        currentSnapshot = newSnapshot;
    }

    return results;
}

/**
 * Async version of simulate that yields to the event loop to allow UI updates.
 */
export async function simulateAsync(
    actions: Action[],
    context: SimulationContext,
    baseState: EngineState,
    onProgress?: (current: number, total: number) => void,
    startIndex: number = 0
): Promise<Action[]> {
    const results: Action[] = [];
    let previousSnapshot: CalculationsSnapshot | null = null;
    const baseSnapshot = computeSnapshot(baseState, context);

    let currentState = baseState;
    let currentSnapshot = baseSnapshot;

    // Yield every 20 actions to keep UI responsive
    // A smaller number makes the UI smoother but total time slightly longer
    const YIELD_INTERVAL = 20;

    for (let i = 0; i < actions.length; i++) {
        // Yield check
        if (i % YIELD_INTERVAL === 0) {
            if (onProgress) onProgress(i, actions.length);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        let action = actions[i];
        const actualIndex = startIndex + i;

        action = refreshActionPayload(action, currentSnapshot);
        currentState = applyAction(currentState, action);
        const passiveEggs = computePassiveEggsDelivered(action, currentSnapshot);
        currentState = applyPassiveEggs(currentState, passiveEggs);
        const newSnapshot = computeSnapshot(currentState, context);
        const prevSnap = i === 0 ? baseSnapshot : previousSnapshot!;
        const deltas = computeDeltas(prevSnap, newSnapshot);
        const durationSeconds = getActionDuration(action, prevSnap);
        results.push({
            ...action,
            index: actualIndex,
            ...deltas,
            totalTimeSeconds: durationSeconds,
            endState: newSnapshot,
        });
        currentState = {
            ...currentState,
            population: newSnapshot.population,
            lastStepTime: newSnapshot.lastStepTime,
            eggsDelivered: { ...newSnapshot.eggsDelivered },
            fuelTankAmounts: { ...newSnapshot.fuelTankAmounts },
        };
        previousSnapshot = newSnapshot;
        currentSnapshot = newSnapshot;
    }

    // Final progress update
    if (onProgress) onProgress(actions.length, actions.length);

    return results;
}
