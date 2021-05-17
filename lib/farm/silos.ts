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
    (baseSiloMinutes + researches.reduce((effect, r) => effect + r.perLevel * r.level, 0)) *
    (farm.farm.silosOwned || 0)
  );
}
