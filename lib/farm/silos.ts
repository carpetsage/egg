import { Farm, Research, ResearchInstance } from './farm';

const baseSiloMinutes = 60;
const siloCapacityRelevantResearches: Research[] = [
  {
    id: 'silo_capacity',
    name: 'Silo Capacity',
    maxLevel: 20,
    perLevel: 6,
  },
];

export function siloCapacityResearches(farm: Farm): ResearchInstance[] {
  return farm.researches(siloCapacityRelevantResearches);
}

export function siloMinutes(farm: Farm, researches: ResearchInstance[]): number {
  return (
    (baseSiloMinutes + researches.reduce((effect, r) => effect + r.perLevel * r.level, 0)) * (farm.farm.silosOwned || 0)
  );
}

/**
 * Calculate the cost of the next silo
 * @param silosOwned Current number of silos owned
 * @returns Cost of next silo
 */
export function nextSiloCost(silosOwned: number): number {
  if (silosOwned <= 0) {
    return 0;
  }
  // Formula: 100M * n^(3*n+15)
  return 100_000_000 * Math.pow(silosOwned, 3 * silosOwned + 15);
}

/**
 * Calculate away time per silo in minutes
 * @param siloCapacityLevel Epic research level of silo capacity
 * @returns Minutes of away time per silo
 */
export function awayTimePerSilo(siloCapacityLevel: number): number {
  return 60 + siloCapacityLevel * 6;
}

/**
 * Calculate total away time in minutes
 * @param silosOwned Number of silos owned
 * @param siloCapacityLevel Epic research level of silo capacity
 * @returns Total away time in minutes
 */
export function totalAwayTime(silosOwned: number, siloCapacityLevel: number): number {
  return silosOwned * awayTimePerSilo(siloCapacityLevel);
}

/**
 * Format duration in minutes to hours and minutes
 * @param minutes Duration in minutes
 * @returns Formatted string like "12h 30m" or "5h"
 */
export function formatSiloDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
