import type { CalculationsSnapshot } from '@/types';

/**
 * A future point (relative to t=0 of the calculation) at which the earnings boost's active state
 * changes. `boostActive` is the state that applies AFTER this transition. A transition with
 * `atSeconds <= 0` means the snapshot's own `earningsBoost.active` is stale for this window (it
 * wasn't re-derived at this point in time) — the most recent such transition wins as the true
 * state at t=0, overriding the snapshot's flag, rather than creating a mid-window segment.
 */
export interface EarningsRateTransition {
  atSeconds: number;
  boostActive: boolean;
}

/**
 * Solve for time T in: integral from 0 to T of min(R * min(P0 + I*t, HabCap), S) dt = targetAmount
 */
export function solveForTime(
  targetAmount: number,
  P0: number,
  I: number,
  R: number,
  S: number,
  HabCap: number = Infinity
): number {
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

  const Gcap = I > 0 && Tcap !== Infinity ? R * (P0 * Tcap + 0.5 * I * Tcap * Tcap) : Infinity;

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
 * Calculate the total earnings integrated over a period of time [0, seconds], accounting for any
 * number of earnings-boost transitions within that window (boost starting, ending, or both).
 *
 * Egg-delivery physics (population growth, hab/shipping caps — everything `integrateRate` models)
 * are entirely independent of the earnings boost: the boost is a pure post-hoc multiplier on the
 * dollar value of delivered eggs. So a transition only ever changes the $-per-egg conversion rate
 * for the segment after it, never the underlying egg integral — each segment's earnings are just
 * `rate * (eggs at segment end - eggs at segment start)`, summed across segments.
 */
export function calculateEarningsForTime(
  seconds: number,
  prevSnapshot: CalculationsSnapshot,
  transitions: EarningsRateTransition[] = []
): number {
  if (seconds <= 0) return 0;
  const V1 = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
  if (V1 <= 0) return 0;

  const multiplier = prevSnapshot.earningsBoost.multiplier || 1;
  const currentActive = prevSnapshot.earningsBoost.active;
  const rateFor = (active: boolean) => (active === currentActive ? V1 : active ? V1 * multiplier : V1 / multiplier);

  const eggsAt = (t: number) =>
    integrateRate(
      t,
      prevSnapshot.population,
      prevSnapshot.offlineIHR / 60,
      prevSnapshot.ratePerChickenPerSecond,
      prevSnapshot.shippingCapacity,
      prevSnapshot.habCapacity
    );

  // Transitions at/before t=0 mean prevSnapshot's own `earningsBoost.active` is stale for this
  // window — the most recent one wins as the true state at t=0. Only transitions strictly inside
  // (0, seconds) create additional segments.
  const past = transitions.filter(t => t.atSeconds <= 0).sort((a, b) => b.atSeconds - a.atSeconds);
  const future = transitions
    .filter(t => t.atSeconds > 0 && t.atSeconds < seconds)
    .sort((a, b) => a.atSeconds - b.atSeconds);

  let segmentActive = past.length > 0 ? past[0].boostActive : currentActive;
  let segmentStart = 0;
  let total = 0;

  for (const transition of future) {
    total += rateFor(segmentActive) * (eggsAt(transition.atSeconds) - eggsAt(segmentStart));
    segmentStart = transition.atSeconds;
    segmentActive = transition.boostActive;
  }
  total += rateFor(segmentActive) * (eggsAt(seconds) - eggsAt(segmentStart));

  return total;
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
 * Helper to get time to save for a cost, accounting for population growth and caps, plus any
 * number of earnings-boost transitions within the wait (the boost starting, ending, or both).
 *
 * Same insight as `calculateEarningsForTime`: population growth is boost-independent, so each
 * regime between transitions can be solved with the existing `solveForTime`/`integrateRate`
 * machinery by re-anchoring `P0` to the population already reached at that regime's start time
 * (`min(P0 + I*t, HabCap)`) — the growth curve restarting from that point is identical to the
 * original curve continuing from there.
 */
export function getTimeToSave(
  cost: number,
  prevSnapshot: CalculationsSnapshot,
  transitions: EarningsRateTransition[] = []
): number {
  const effectiveCost = Math.max(0, cost - (prevSnapshot.bankValue || 0));
  if (effectiveCost <= 0) return 0;

  const V1 = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
  if (V1 <= 0) return Infinity;

  const multiplier = prevSnapshot.earningsBoost.multiplier || 1;
  const currentActive = prevSnapshot.earningsBoost.active;
  const rateFor = (active: boolean) => (active === currentActive ? V1 : active ? V1 * multiplier : V1 / multiplier);

  const P0 = prevSnapshot.population;
  const I = prevSnapshot.offlineIHR / 60;
  const R = prevSnapshot.ratePerChickenPerSecond;
  const S = prevSnapshot.shippingCapacity;
  const HabCap = prevSnapshot.habCapacity;
  const eggsAt = (t: number) => integrateRate(t, P0, I, R, S, HabCap);
  const popAt = (t: number) => Math.min(HabCap, P0 + I * t);

  const past = transitions.filter(t => t.atSeconds <= 0).sort((a, b) => b.atSeconds - a.atSeconds);
  const future = transitions
    .filter(t => t.atSeconds > 0)
    .sort((a, b) => a.atSeconds - b.atSeconds);

  let segmentActive = past.length > 0 ? past[0].boostActive : currentActive;
  let segmentStart = 0;
  let dollarsSoFar = 0;

  const regimeEnds = [...future.map(t => t.atSeconds), Infinity];

  for (let i = 0; i < regimeEnds.length; i++) {
    const regimeEnd = regimeEnds[i];
    const rate = rateFor(segmentActive);
    const dollarsAvailable = regimeEnd === Infinity ? Infinity : rate * (eggsAt(regimeEnd) - eggsAt(segmentStart));

    if (dollarsSoFar + dollarsAvailable >= effectiveCost) {
      const neededEggs = (effectiveCost - dollarsSoFar) / rate;
      const tWithinRegime = solveForTime(neededEggs, popAt(segmentStart), I, R, S, HabCap);
      return segmentStart + tWithinRegime;
    }

    dollarsSoFar += dollarsAvailable;
    segmentStart = regimeEnd;
    segmentActive = i < future.length ? future[i].boostActive : segmentActive;
  }

  return Infinity;
}
