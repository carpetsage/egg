import { getNumProphecyEggs } from '../prophecy_eggs';
import { Farm, Research, ResearchInstance } from './farm';

const baseSoulEggBonus = 0.1;
const soulEggBonusRelevantResearches: Research[] = [
  {
    id: 'soul_eggs',
    name: 'Soul Food',
    maxLevel: 140,
    perLevel: 0.01,
  },
];

const baseProphecyEggBonus = 0.05;
const prophecyEggBonusRelevantResearches: Research[] = [
  {
    id: 'prophecy_bonus',
    name: 'Prophecy Bonus',
    maxLevel: 5,
    perLevel: 0.01,
  },
];

export function soulEggBonusResearches(farm: Farm): ResearchInstance[] {
  return farm.researches(soulEggBonusRelevantResearches);
}

export function prophecyEggBonusResearches(farm: Farm): ResearchInstance[] {
  return farm.researches(prophecyEggBonusRelevantResearches);
}

function soulEggBonus(farm: Farm, researches: ResearchInstance[]): number {
  return (
    baseSoulEggBonus +
    researches.reduce((effect, r) => effect + r.perLevel * r.level, 0) +
    farm.artifactSet.soulEggBonus
  );
}

function prophecyEggBonus(farm: Farm, researches: ResearchInstance[]): number {
  return (
    baseProphecyEggBonus +
    researches.reduce((effect, r) => effect + r.perLevel * r.level, 0) +
    farm.artifactSet.prophecyEggBonus
  );
}

export function earningBonus(
  farm: Farm,
  soulEggBonusResearches: ResearchInstance[],
  prophecyEggBonusResearches: ResearchInstance[]
): number {
  const soulEggsCount = farm.progress.soulEggsD || 0;
  const prophecyEggsCount = getNumProphecyEggs(farm.backup);
  return (
    soulEggsCount *
    soulEggBonus(farm, soulEggBonusResearches) *
    (1 + prophecyEggBonus(farm, prophecyEggBonusResearches)) ** prophecyEggsCount
  );
}
