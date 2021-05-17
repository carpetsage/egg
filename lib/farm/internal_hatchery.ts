import { Farm, Research } from './farm';

export interface InternalHatcheryRateResearch extends Research {
  multiplicative?: boolean;
  offlineOnly?: boolean;
}

export interface InternalHatcheryRateResearchInstance extends InternalHatcheryRateResearch {
  level: number;
}

const internalHatcheryRateRelevantResearches: InternalHatcheryRateResearch[] = [
  {
    id: 'internal_hatchery1',
    name: 'Internal Hatcheries',
    maxLevel: 10,
    perLevel: 2,
  },
  {
    id: 'internal_hatchery2',
    name: 'Internal Hatchery Upgrades',
    maxLevel: 10,
    perLevel: 5,
  },
  {
    id: 'internal_hatchery3',
    name: 'Internal Hatchery Expansion',
    maxLevel: 15,
    perLevel: 10,
  },
  {
    id: 'internal_hatchery4',
    name: 'Internal Hatchery Expansion',
    maxLevel: 30,
    perLevel: 25,
  },
  {
    id: 'internal_hatchery5',
    name: 'Machine Learning Incubators',
    maxLevel: 250,
    perLevel: 5,
  },
  {
    id: 'neural_linking',
    name: 'Neural Linking',
    maxLevel: 30,
    perLevel: 50,
  },
  {
    id: 'epic_internal_incubators',
    name: 'Epic Int. Hatcheries',
    maxLevel: 20,
    perLevel: 0.05,
    epic: true,
    multiplicative: true,
  },
  {
    id: 'int_hatch_calm',
    name: 'Internal Hatchery Calm',
    maxLevel: 20,
    perLevel: 0.1,
    epic: true,
    multiplicative: true,
    offlineOnly: true,
  },
];

export function internalHatcheryRateResearches(farm: Farm): InternalHatcheryRateResearchInstance[] {
  return farm.researches(internalHatcheryRateRelevantResearches);
}

export function internalHatcheryChickensPerMinutePerHab(
  farm: Farm,
  researches: InternalHatcheryRateResearchInstance[]
): { active: number; away: number } {
  let baseRate = 0;
  let activeMultiplier = 1;
  let awayMultiplier = 1;
  for (const research of researches) {
    if (research.multiplicative) {
      const multiplier = 1 + research.level * research.perLevel;
      if (research.offlineOnly) {
        awayMultiplier *= multiplier;
      } else {
        activeMultiplier *= multiplier;
      }
    } else {
      baseRate += research.level * research.perLevel;
    }
  }
  const artifactsMultiplier = farm.artifactSet.internalHatcheryRateMultiplier;
  const active = baseRate * activeMultiplier * artifactsMultiplier;
  const away = active * awayMultiplier;
  return {
    active,
    away,
  };
}
