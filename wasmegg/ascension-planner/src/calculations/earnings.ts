/**
 * Earnings calculation.
 * Earnings = egg value × ELR × TE multiplier, with colleggtible bonuses.
 * Online and offline earnings differ due to offline-only bonuses.
 */

import type { EarningsInput, EarningsOutput } from '@/types';

/**
 * Calculate earnings (online and offline).
 */
export function calculateEarnings(input: EarningsInput): EarningsOutput {
  const { eggValue, effectiveLayRate, te, fireworkMultiplier, awayEarningsMultiplier, artifactAwayMultiplier, artifactEffects } = input;

  // TE multiplier: 1.1^TE (clamped to 0-490)
  const clampedTE = Math.max(0, Math.min(490, Math.round(te)));
  const teMultiplier = Math.pow(1.1, clampedTE);

  // Base earnings = egg value × ELR × TE multiplier
  const baseEarnings = eggValue * effectiveLayRate * teMultiplier;

  // Online earnings: only firework bonus applies
  const onlineEarnings = baseEarnings * fireworkMultiplier;

  // Offline earnings: firework + away earnings (chocolate * wood) + artifacts (lunar) apply
  // Note: lunar artifacts are multiplicative with each other and with colleggtibles
  const offlineEarnings = baseEarnings * fireworkMultiplier * awayEarningsMultiplier * artifactAwayMultiplier;

  return {
    baseEarnings,
    teMultiplier,
    fireworkMultiplier,
    awayEarningsMultiplier,
    artifactAwayMultiplier,
    onlineEarnings,
    offlineEarnings,
    artifactBreakdown: artifactEffects,
  };
}
