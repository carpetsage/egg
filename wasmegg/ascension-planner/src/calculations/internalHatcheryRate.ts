/**
 * Pure calculation functions for Internal Hatchery Rate (IHR).
 * These have no Vue dependencies and are fully testable.
 */

import type {
  Research,
  ResearchLevels,
  IHRInput,
  IHROutput
} from '@/types';
import { allResearches } from 'lib';

/**
 * IHR research with additional flags for multiplicative/offline behavior.
 */
export interface IHRResearch {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  perLevel: number;
  isMultiplicative: boolean;
  isOfflineOnly: boolean;
  isEpic: boolean;
}

// Common research IDs for IHR (from researches.json)
const commonIHRResearchIds = [
  'internal_hatchery1',  // Internal Hatcheries
  'internal_hatchery2',  // Internal Hatchery Upgrades
  'internal_hatchery3',  // Internal Hatchery Expansion
  'internal_hatchery4',  // Internal Hatchery Expansion
  'internal_hatchery5',  // Machine Learning Incubators
  'neural_linking',      // Neural Linking
];

// Build common researches from JSON
const commonIHRResearches: IHRResearch[] = (allResearches as Research[])
  .filter(r => commonIHRResearchIds.includes(r.id))
  .map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    maxLevel: r.levels,
    perLevel: r.per_level,
    isMultiplicative: false,
    isOfflineOnly: false,
    isEpic: false,
  }));

// Epic researches (not in researches.json, defined manually)
const epicIHRResearches: IHRResearch[] = [
  {
    id: 'epic_internal_incubators',
    name: 'Epic Int. Hatcheries',
    description: 'Increases internal hatchery rate by 5% per level',
    maxLevel: 20,
    perLevel: 0.05,
    isMultiplicative: true,
    isOfflineOnly: false,
    isEpic: true,
  },
  {
    id: 'int_hatch_calm',
    name: 'Internal Hatchery Calm',
    description: 'Increases internal hatchery rate by 10% per level when away',
    maxLevel: 20,
    perLevel: 0.10,
    isMultiplicative: true,
    isOfflineOnly: true,
    isEpic: true,
  },
];

// All IHR researches combined
const allIHRResearches: IHRResearch[] = [...commonIHRResearches, ...epicIHRResearches];

/**
 * Calculate contribution from a single research at a given level.
 * For additive: returns chickens/min added
 * For multiplicative: returns the multiplier value
 */
export function calculateResearchContribution(research: IHRResearch, level: number): number {
  if (level <= 0) return research.isMultiplicative ? 1 : 0;
  const clampedLevel = Math.min(level, research.maxLevel);

  if (research.isMultiplicative) {
    return 1 + (research.perLevel * clampedLevel);
  } else {
    return research.perLevel * clampedLevel;
  }
}

/**
 * Main calculation: compute IHR with full breakdown.
 * Assumes 4 habs for total rate.
 */
export function calculateIHR(input: IHRInput): IHROutput {
  const { te, researchLevels, epicResearchLevels, easterEggMultiplier, artifactMultiplier, artifactEffects } = input;

  // Calculate base rate from additive researches (per hab)
  let baseRatePerHab = 0;
  for (const research of commonIHRResearches) {
    const level = researchLevels[research.id] || 0;
    baseRatePerHab += calculateResearchContribution(research, level);
  }

  // Calculate TE multiplier (1.1^TE)
  const clampedTE = Math.max(0, Math.min(490, Math.round(te)));
  const teMultiplier = Math.pow(1.1, clampedTE);

  // Calculate epic multiplier (Epic Int. Hatcheries)
  const epicMultiplier = 1 + (epicResearchLevels.epicInternalIncubators * 0.05);

  // Calculate offline multiplier (Internal Hatchery Calm)
  const offlineMultiplier = 1 + (epicResearchLevels.internalHatcheryCalm * 0.10);

  // Calculate final rates (multiply by 4 for 4 habs)
  const numHabs = 4;
  const onlineRate = baseRatePerHab * teMultiplier * epicMultiplier * easterEggMultiplier * artifactMultiplier * numHabs;
  const offlineRate = onlineRate * offlineMultiplier;

  // Build research breakdown for display
  const researchBreakdown = allIHRResearches.map(research => {
    let level: number;
    if (research.id === 'epic_internal_incubators') {
      level = epicResearchLevels.epicInternalIncubators;
    } else if (research.id === 'int_hatch_calm') {
      level = epicResearchLevels.internalHatcheryCalm;
    } else {
      level = researchLevels[research.id] || 0;
    }

    return {
      researchId: research.id,
      name: research.name,
      description: research.description,
      level,
      maxLevel: research.maxLevel,
      contribution: calculateResearchContribution(research, level),
      isMultiplicative: research.isMultiplicative,
      isOfflineOnly: research.isOfflineOnly,
      isEpic: research.isEpic,
    };
  });

  return {
    baseRatePerHab,
    teMultiplier,
    epicMultiplier,
    easterEggMultiplier,
    artifactMultiplier,
    offlineMultiplier,
    onlineRate,
    offlineRate,
    researchBreakdown,
    artifactBreakdown: artifactEffects,
  };
}

/**
 * Get all IHR researches for display/iteration.
 */
export function getIHRResearches(): IHRResearch[] {
  return allIHRResearches;
}

/**
 * Get only common (non-epic) IHR researches.
 */
export function getCommonIHRResearches(): IHRResearch[] {
  return commonIHRResearches;
}

/**
 * Get only epic IHR researches.
 */
export function getEpicIHRResearches(): IHRResearch[] {
  return epicIHRResearches;
}
