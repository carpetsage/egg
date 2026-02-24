import type { VirtueEgg } from './virtue';

/**
 * Payload for waiting to accumulate Truth Eggs (TE).
 */
export interface WaitForTEPayload {
    egg: VirtueEgg;         // Which virtue egg
    targetTE: number;       // Target TE number (1-98)
    teGained: number;       // How many TE gained in this action
    eggsToLay: number;      // Eggs to lay to reach target
    timeSeconds: number;    // Time required
    startEggsDelivered: number; // Eggs delivered before this action
    startTE: number;            // TE thresholds passed before this action
}

/**
 * Payload for waiting for a fixed amount of time.
 */
export interface WaitForTimePayload {
    totalTimeSeconds: number;
}

/**
 * Payload for waiting for habs to fill.
 */
export interface WaitForFullHabsPayload {
    habCapacity: number;
    ihr: number;
    currentPopulation: number;
    totalTimeSeconds: number;
}
