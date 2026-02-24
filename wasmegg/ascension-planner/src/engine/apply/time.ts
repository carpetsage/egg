import type { CalculationsSnapshot } from '@/types';
import type { EngineState } from '../types';

/**
 * Advance the simulation time in the engine state and add earned gems to the bank.
 */
export function applyTime(
    state: EngineState,
    seconds: number,
    prevSnapshot: CalculationsSnapshot,
    skipBankUpdate: boolean = false
): EngineState {
    if (seconds <= 0) return state;

    const P0 = prevSnapshot.population;
    const I = prevSnapshot.offlineIHR / 60;
    const R = prevSnapshot.ratePerChickenPerSecond;
    const S = prevSnapshot.shippingCapacity;
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    const maxPop = prevSnapshot.habCapacity;

    const newPop = Math.min(maxPop, P0 + I * seconds);

    let earnedGems = 0;
    if (V > 0 && !skipBankUpdate) {
        let Tship = Infinity;
        if (I > 0) {
            Tship = (S / R - P0) / I;
        } else if (R * P0 >= S) {
            Tship = 0;
        }

        if (Tship <= 0) {
            earnedGems = V * S * seconds;
        } else if (seconds <= Tship) {
            earnedGems = V * R * (P0 * seconds + 0.5 * I * seconds * seconds);
        } else {
            const Gship = V * R * (P0 * Tship + 0.5 * I * Tship * Tship);
            const Gafter = V * S * (seconds - Tship);
            earnedGems = Gship + Gafter;
        }
    }

    let newBankValue = (state.bankValue || 0) + earnedGems;
    if (prevSnapshot.offlineEarnings > 0) {
        if (Math.abs(newBankValue) < prevSnapshot.offlineEarnings * 1e-6) {
            newBankValue = 0;
        }
    }

    return {
        ...state,
        population: newPop,
        lastStepTime: (state.lastStepTime || 0) + seconds,
        bankValue: newBankValue,
    };
}

/**
 * Apply passive egg delivery to an engine state.
 */
export function applyPassiveEggs(state: EngineState, passiveEggs: number): EngineState {
    if (passiveEggs <= 0) return state;
    const egg = state.currentEgg;
    return {
        ...state,
        eggsDelivered: {
            ...state.eggsDelivered,
            [egg]: (state.eggsDelivered[egg] || 0) + passiveEggs,
        },
    };
}
