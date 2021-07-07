import { Farm, Research, ResearchInstance } from './farm';

const baseMaxRunningChickenBonus = 5;
const maxRunningChickenBonusRelevantResearches: Research[] = [
  {
    id: 'coordinated_clucking',
    name: 'Coordinated Clucking',
    maxLevel: 50,
    perLevel: 0.2,
  },
  {
    id: 'motivational_clucking',
    name: 'Motivational Clucking',
    maxLevel: 50,
    perLevel: 0.5,
  },
  {
    id: 'enlightened_chickens',
    name: 'Enlightened Chickens',
    maxLevel: 150,
    perLevel: 2,
  },
  {
    id: 'epic_multiplier',
    name: 'Epic Multiplier',
    maxLevel: 100,
    perLevel: 2,
  },
];

export function maxRunningChickenBonusResearches(farm: Farm): ResearchInstance[] {
  return farm.researches(maxRunningChickenBonusRelevantResearches);
}

export function bareMaxRunningChickenBonus(farm: Farm, researches: ResearchInstance[]): number {
  return (
    baseMaxRunningChickenBonus + researches.reduce((effect, r) => effect + r.perLevel * r.level, 0)
  );
}

export function maxRunningChickenBonus(farm: Farm, researches: ResearchInstance[]): number {
  return bareMaxRunningChickenBonus(farm, researches) + farm.artifactSet.maxRunningChickenBonus;
}

export function bareMaxRunningChickenBonusWithMaxedCommonResearches(
  farm: Farm,
  researches: ResearchInstance[]
): number {
  return (
    baseMaxRunningChickenBonus +
    researches.reduce(
      (effect, r) => effect + r.perLevel * (r.id === 'epic_multiplier' ? r.level : r.maxLevel),
      0
    )
  );
}

export function maxRunningChickenBonusWithMaxedCommonResearches(
  farm: Farm,
  researches: ResearchInstance[]
): number {
  return (
    bareMaxRunningChickenBonusWithMaxedCommonResearches(farm, researches) +
    farm.artifactSet.maxRunningChickenBonus
  );
}
