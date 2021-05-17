import { Farm, Research, ResearchInstance } from './farm';

export type EggLayingRateResearch = Research;
export type EggLayingRateResearchInstance = ResearchInstance;

const baseEggLayingRate = 1 / 30; // 1 egg per 30 seconds

// https://wasmegg.netlify.app/researches/
// SELECT id, name, levels AS maxLevel, per_level AS perLevel, iif(levels_compound = 'multiplicative', true, NULL) AS compoundMultiplicatively FROM research WHERE categories LIKE '%egg_value%' ORDER BY serial_id;
const eggLayingRateRelevantResearches: EggLayingRateResearch[] = [
  {
    id: 'comfy_nests',
    name: 'Comfortable Nests',
    maxLevel: 50,
    perLevel: 0.1,
  },
  {
    id: 'hen_house_ac',
    name: 'Hen House A/C',
    maxLevel: 50,
    perLevel: 0.05,
  },
  {
    id: 'improved_genetics',
    name: 'Improved Genetics',
    maxLevel: 30,
    perLevel: 0.15,
  },
  {
    id: 'time_compress',
    name: 'Time Compression',
    maxLevel: 20,
    perLevel: 0.1,
  },
  {
    id: 'timeline_diversion',
    name: 'Timeline Diversion',
    maxLevel: 50,
    perLevel: 0.02,
  },
  {
    id: 'relativity_optimization',
    name: 'Relativity Optimization',
    maxLevel: 10,
    perLevel: 0.1,
  },
  {
    id: 'epic_egg_laying',
    name: 'Epic Comfy Nests',
    maxLevel: 20,
    perLevel: 0.05,
  },
];

export function eggLayingRateResearches(farm: Farm): EggLayingRateResearchInstance[] {
  return farm.researches(eggLayingRateRelevantResearches);
}

export function layableEggsPerSecond(
  farm: Farm,
  researches: EggLayingRateResearchInstance[]
): number {
  return (
    farm.numChickens *
    baseEggLayingRate *
    researches.reduce((effect, r) => effect * (1 + r.perLevel * r.level), 1) *
    farm.artifactSet.eggLayingRateMultiplier
  );
}
