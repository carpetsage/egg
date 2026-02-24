import type { CalculationsSnapshot } from '@/types';

/**
 * Solve for time T in: integral from 0 to T of min(R * (P0 + I*t), S) dt = targetAmount
 */
export function solveForTime(targetAmount: number, P0: number, I: number, R: number, S: number): number {
    if (targetAmount <= 0) return 0;
    if (R * P0 >= S) {
        return S > 0 ? targetAmount / S : Infinity;
    }
    const Tship = (S / R - P0) / I;
    const Gship = (I > 0 && Tship !== Infinity) ? (R * (P0 * Tship + 0.5 * I * Tship * Tship)) : Infinity;

    if (targetAmount <= Gship) {
        const a = 0.5 * R * I;
        const b = R * P0;
        const c = -targetAmount;
        if (a === 0) return b > 0 ? targetAmount / b : Infinity;
        return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    } else {
        const Tremaining = (targetAmount - Gship) / S;
        return Tship + Tremaining;
    }
}

/**
 * Calculate the total earnings integrated over a period of time [0, seconds].
 */
export function calculateEarningsForTime(seconds: number, prevSnapshot: CalculationsSnapshot): number {
    if (seconds <= 0) return 0;
    const P0 = prevSnapshot.population;
    const I = prevSnapshot.offlineIHR / 60;
    const R = prevSnapshot.ratePerChickenPerSecond;
    const S = prevSnapshot.shippingCapacity;
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    if (V <= 0) return 0;

    let Tship = Infinity;
    if (I > 0) {
        Tship = (S / R - P0) / I;
    } else if (R * P0 >= S) {
        Tship = 0;
    }

    if (Tship <= 0) {
        return V * S * seconds;
    } else if (seconds <= Tship) {
        return V * R * (P0 * seconds + 0.5 * I * seconds * seconds);
    } else {
        const Gship = V * R * (P0 * Tship + 0.5 * I * Tship * Tship);
        const Gafter = V * S * (seconds - Tship);
        return Gship + Gafter;
    }
}

/**
 * Helper to get time to save for a cost, accounting for population growth.
 */
export function getTimeToSave(cost: number, prevSnapshot: CalculationsSnapshot): number {
    const effectiveCost = Math.max(0, cost - (prevSnapshot.bankValue || 0));
    if (effectiveCost <= 0) return 0;
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    if (V <= 0) return Infinity;

    return solveForTime(
        effectiveCost / V,
        prevSnapshot.population,
        prevSnapshot.offlineIHR / 60,
        prevSnapshot.ratePerChickenPerSecond,
        prevSnapshot.shippingCapacity
    );
}
