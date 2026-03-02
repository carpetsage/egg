import { getNextPacificTime } from '@/lib/events';
import type { CalculationsSnapshot } from '@/types';

export enum EventType {
    RESEARCH_SALE = 'research',
    EARNINGS_BOOST = 'earnings',
}

import { useVirtueStore } from '@/stores/virtue';
import { useActionsStore } from '@/stores/actions';

/**
 * Calculates the next expiration time for an event type based on simulation time.
 * Returns the expiration time as a relative simulation time (seconds from plan start).
 */
export function getEventExpirationTime(fromSimSeconds: number, type: EventType): number {
    const virtueStore = useVirtueStore();
    const actionsStore = useActionsStore();

    // Convert simulation time to absolute Unix timestamp (seconds)
    // Wall clock time = (Plan Start) + (Current Sim Time - Initial Sim Time)
    const planStartTimeSecs = Math.floor(virtueStore.planStartTime.getTime() / 1000);
    const planStartOffset = actionsStore.planStartOffset;
    const currentAbsoluteTime = planStartTimeSecs + (fromSimSeconds - planStartOffset);

    let endAbsoluteTime: number;
    if (type === EventType.RESEARCH_SALE) {
        // Find next Saturday at 9 AM Pacific.
        // We search from 24 hours ago to catch thresholds that might have just passed 
        // if the event is still active in simulation state.
        endAbsoluteTime = getNextPacificTime(6, 9, currentAbsoluteTime - 86400);
    } else {
        // Find next Tuesday at 9 AM Pacific from the current simulated wall clock time
        endAbsoluteTime = getNextPacificTime(2, 9, currentAbsoluteTime - 86400);
    }

    // Convert back to relative simulation time
    return endAbsoluteTime - planStartTimeSecs + planStartOffset;
}

/**
 * Checks if an action with a given duration and timestamp will cross the event boundary.
 * 
 * @param snapshot Current simulation snapshot
 * @param duration Duration of the proposed action(s) in seconds
 * @param type Type of event to check against
 * @returns { isCrossed: boolean, endTime: number, completionTime: number }
 */
export function checkEventCrossing(
    snapshot: CalculationsSnapshot,
    duration: number,
    type: EventType
): { isCrossed: boolean; endTime: number; completionTime: number } {
    const currentSimTime = snapshot.lastStepTime;
    const isActive = type === EventType.RESEARCH_SALE
        ? snapshot.activeSales.research
        : snapshot.earningsBoost.active;

    if (!isActive) {
        return { isCrossed: false, endTime: 0, completionTime: 0 };
    }

    const virtueStore = useVirtueStore();
    const actionsStore = useActionsStore();
    const planStartTimeSecs = Math.floor(virtueStore.planStartTime.getTime() / 1000);
    const planStartOffset = actionsStore.planStartOffset;

    const endTimeSim = getEventExpirationTime(currentSimTime, type);
    const completionTimeSim = currentSimTime + duration;

    // Convert simulation offsets to absolute Unix timestamps for the UI
    const endTimeAbs = planStartTimeSecs + (endTimeSim - planStartOffset);
    const completionTimeAbs = planStartTimeSecs + (completionTimeSim - planStartOffset);

    return {
        // We warn if it completes after the threshold. 
        // We no longer strictly check if currentSimTime < endTimeSim to handle cases 
        // where the user is already slightly past the threshold but the event is still toggled on.
        isCrossed: completionTimeSim > endTimeSim,
        endTime: endTimeAbs,
        completionTime: completionTimeAbs,
    };
}
