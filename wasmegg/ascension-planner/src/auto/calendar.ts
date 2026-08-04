import { getNextPacificTime } from '@/lib/events';

/**
 * Returns the Unix timestamp (in seconds) of the next Research Sale start (Friday 9 AM PT).
 */
export function getNextSaleStart(timestampSeconds: number): number {
  return getNextPacificTime(5, 9, timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the next Research Sale end (Saturday 9 AM PT).
 */
export function getNextSaleEnd(timestampSeconds: number): number {
  return getNextPacificTime(6, 9, timestampSeconds);
}

/**
 * Returns true if a Research Sale is active at the given timestamp.
 */
export function isResearchSaleActive(timestampSeconds: number): boolean {
  // If the next end is sooner than the next start, we are currently in a sale.
  return getNextSaleEnd(timestampSeconds) < getNextSaleStart(timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the next Earnings Boost start (Monday 9 AM PT).
 */
export function getNextEarningsBoostStart(timestampSeconds: number): number {
  return getNextPacificTime(1, 9, timestampSeconds);
}

/**
 * Returns the Unix timestamp (in seconds) of the next Earnings Boost end (Tuesday 9 AM PT).
 */
export function getNextEarningsBoostEnd(timestampSeconds: number): number {
  return getNextPacificTime(2, 9, timestampSeconds);
}

/**
 * Returns true if an Earnings Boost is active at the given timestamp.
 */
export function isEarningsBoostActive(timestampSeconds: number): boolean {
  // If the next end is sooner than the next start, we are currently in an earnings boost.
  return getNextEarningsBoostEnd(timestampSeconds) < getNextEarningsBoostStart(timestampSeconds);
}
