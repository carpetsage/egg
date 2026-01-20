/**
 * Calculate current population based on last save and IHR
 * @param lastRefreshedPopulation Population at last save
 * @param offlineIHR Offline internal hatchery rate (chickens per minute)
 * @param currentTimestamp Current timestamp in milliseconds
 * @param lastRefreshedTimestamp Last save timestamp in milliseconds
 * @param totalHabSpace Maximum hab capacity
 * @returns Current estimated population
 */
export function calculateCurrentPopulation(
  lastRefreshedPopulation: number,
  offlineIHR: number,
  currentTimestamp: number,
  lastRefreshedTimestamp: number,
  totalHabSpace: number
): number {
  return Math.min(
    lastRefreshedPopulation + (offlineIHR / 60_000) * (currentTimestamp - lastRefreshedTimestamp),
    Math.max(lastRefreshedPopulation, totalHabSpace)
  );
}

/**
 * Calculate time to fill habs (hab lock) in seconds
 * @param totalHabSpace Maximum hab capacity
 * @param currentPopulation Current population
 * @param ihr Internal hatchery rate (chickens per minute)
 * @returns Time in seconds to fill habs
 */
export function calculateTimeToHabLock(totalHabSpace: number, currentPopulation: number, ihr: number): number {
  return Math.max(0, (60 * (totalHabSpace - currentPopulation)) / ihr);
}
