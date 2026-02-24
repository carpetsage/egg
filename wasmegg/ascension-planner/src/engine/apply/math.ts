import type { CalculationsSnapshot } from '@/types';

/**
 * Solve for time T in: integral from 0 to T of min(R * min(P0 + I*t, HabCap), S) dt = targetAmount
 */
export function solveForTime(targetAmount: number, P0: number, I: number, R: number, S: number, HabCap: number = Infinity): number {
    if (targetAmount <= 0) return 0;

    const CapRate = Math.min(S, R * HabCap);

    if (R * P0 >= CapRate) {
        return CapRate > 0 ? targetAmount / CapRate : Infinity;
    }

    // Time when rate hits CapRate
    let Tcap = Infinity;
    if (I > 0) {
        Tcap = (CapRate / R - P0) / I;
    }

    const Gcap = (I > 0 && Tcap !== Infinity) ? (R * (P0 * Tcap + 0.5 * I * Tcap * Tcap)) : Infinity;

    if (targetAmount <= Gcap) {
        const a = 0.5 * R * I;
        const b = R * P0;
        const c = -targetAmount;
        if (a === 0) return b > 0 ? targetAmount / b : Infinity;
        return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    } else {
        const Tremaining = (targetAmount - Gcap) / CapRate;
        return Tcap + Tremaining;
    }
}

/**
 * Integrated rate from 0 to T: integral from 0 to T of min(R * min(P0 + I*t, HabCap), S) dt
 */
export function integrateRate(seconds: number, P0: number, I: number, R: number, S: number, HabCap: number): number {
    if (seconds <= 0) return 0;

    const CapRate = Math.min(S, R * HabCap);

    let Tcap = Infinity;
    if (I > 0) {
        Tcap = (CapRate / R - P0) / I;
    } else if (R * P0 >= CapRate) {
        Tcap = 0;
    }

    if (Tcap <= 0) {
        return CapRate * seconds;
    } else if (seconds <= Tcap) {
        return R * (P0 * seconds + 0.5 * I * seconds * seconds);
    } else {
        const Gcap = R * (P0 * Tcap + 0.5 * I * Tcap * Tcap);
        const Gafter = CapRate * (seconds - Tcap);
        return Gcap + Gafter;
    }
}

/**
 * Calculate the total earnings integrated over a period of time [0, seconds].
 */
export function calculateEarningsForTime(seconds: number, prevSnapshot: CalculationsSnapshot): number {
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    if (V <= 0) return 0;

    const totalEggs = integrateRate(
        seconds,
        prevSnapshot.population,
        prevSnapshot.offlineIHR / 60,
        prevSnapshot.ratePerChickenPerSecond,
        prevSnapshot.shippingCapacity,
        prevSnapshot.habCapacity
    );

    return V * totalEggs;
}

/**
 * Calculate the total eggs delivered integrated over a period of time [0, seconds].
 */
export function calculateEggsDeliveredForTime(seconds: number, prevSnapshot: CalculationsSnapshot): number {
    return integrateRate(
        seconds,
        prevSnapshot.population,
        prevSnapshot.offlineIHR / 60,
        prevSnapshot.ratePerChickenPerSecond,
        prevSnapshot.shippingCapacity,
        prevSnapshot.habCapacity
    );
}

/**
 * Helper to get time to save for a cost, accounting for population growth and caps.
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
        prevSnapshot.shippingCapacity,
        prevSnapshot.habCapacity
    );
}
