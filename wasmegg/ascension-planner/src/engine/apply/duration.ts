import {
    Action,
    CalculationsSnapshot,
    LaunchMissionsPayload,
    WaitForTEPayload,
    StoreFuelPayload,
} from '@/types';
import { solveForTime, getTimeToSave } from './math';
import { eggsNeededForTE, countTEThresholdsPassed } from '@/lib/truthEggs';

/**
 * Recalculate an action's payload based on the state before it executes.
 */
export function refreshActionPayload(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): Action {
    if (action.type === 'wait_for_te') {
        const payload = { ...action.payload as WaitForTEPayload };
        const egg = payload.egg;
        const currentDelivered = prevSnapshot.eggsDelivered[egg] || 0;
        payload.eggsToLay = eggsNeededForTE(currentDelivered, payload.targetTE);
        payload.timeSeconds = solveForTime(
            payload.eggsToLay,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity
        );
        payload.startEggsDelivered = currentDelivered;
        payload.startTE = countTEThresholdsPassed(currentDelivered);
        payload.teGained = Math.max(0, payload.targetTE - payload.startTE);
        return { ...action, payload };
    }

    if (action.type === 'store_fuel') {
        const payload = { ...action.payload as StoreFuelPayload };
        payload.timeSeconds = solveForTime(
            payload.amount,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity
        );
        return { ...action, payload };
    }

    if (action.type === 'wait_for_missions') {
        const payload = { ...action.payload as import('@/types').WaitForMissionsPayload };
        const maxReturn = Math.max(...payload.missions.map(m => m.returnTimestamp || 0));
        payload.totalTimeSeconds = Math.max(0, maxReturn - prevSnapshot.lastStepTime);
        return { ...action, payload };
    }

    if (action.type === 'wait_for_full_habs') {
        const payload = { ...action.payload as import('@/types').WaitForFullHabsPayload };
        payload.habCapacity = prevSnapshot.habCapacity;
        payload.currentPopulation = prevSnapshot.population;
        payload.ihr = prevSnapshot.offlineIHR;
        const chickensNeeded = Math.max(0, payload.habCapacity - payload.currentPopulation);
        payload.totalTimeSeconds = payload.ihr > 0 ? (chickensNeeded / (payload.ihr / 60)) : 0;
        return { ...action, payload };
    }

    return action;
}

/**
 * Calculate the duration of an action in seconds.
 */
export function getActionDuration(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): number {
    if (action.type === 'store_fuel' || action.type === 'wait_for_te') {
        return (action.payload as any).timeSeconds || 0;
    }

    if (
        action.type === 'wait_for_missions' ||
        action.type === 'wait_for_time' ||
        action.type === 'wait_for_full_habs'
    ) {
        return (action.payload as any).totalTimeSeconds || 0;
    }

    if (action.type === 'launch_missions') {
        const T = action.cost > 0 ? getTimeToSave(action.cost, prevSnapshot) : 0;
        return T + ((action.payload as LaunchMissionsPayload).totalTimeSeconds || 0);
    }

    const GEM_COSTING_TYPES = ['buy_research', 'buy_hab', 'buy_vehicle', 'buy_train_car', 'buy_silo'];
    if (GEM_COSTING_TYPES.includes(action.type) && action.cost > 0) {
        return getTimeToSave(action.cost, prevSnapshot);
    }

    return 0;
}

/**
 * Calculate the number of eggs passively delivered during an action's duration.
 */
export function computePassiveEggsDelivered(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): number {
    const NO_PASSIVE_TYPES = [
        'store_fuel', 'wait_for_te', 'start_ascension', 'shift', 'change_artifacts',
        'toggle_sale', 'equip_artifact_set', 'update_artifact_set', 'remove_fuel',
        'toggle_earnings_boost', 'notification'
    ];
    if (NO_PASSIVE_TYPES.includes(action.type)) return 0;

    const durationSeconds = getActionDuration(action, prevSnapshot);
    if (durationSeconds > 0 && prevSnapshot.elr > 0) {
        return prevSnapshot.elr * durationSeconds;
    }
    return 0;
}
