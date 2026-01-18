import { habSpaceMultiplier } from '../effects';
import { ei, Hab, isHabId, habTypes, HabSpaceResearch, HabSpaceResearchInstance, Artifact } from 'lib';
import { farmResearch, farmResearches } from './common';

export type { Hab, HabSpaceResearch, HabSpaceResearchInstance } from 'lib';
export { isHabId } from 'lib';

// Use lib's habTypes as habVarieties for backward compatibility
export const habVarieties: Hab[] = habTypes;

function isPortalHab(hab: Hab): boolean {
  return hab.id >= 17;
}

const availableHabSpaceResearches: HabSpaceResearch[] = [
  {
    id: 'hab_capacity1',
    name: 'Hen House Remodel',
    maxLevel: 8,
    perLevel: 0.05,
  },
  {
    id: 'microlux',
    name: 'Microlux™ Chicken Suites',
    maxLevel: 10,
    perLevel: 0.05,
  },
  {
    id: 'grav_plating',
    name: 'Grav Plating',
    maxLevel: 25,
    perLevel: 0.02,
  },
  {
    id: 'wormhole_dampening',
    name: 'Wormhole Dampening',
    maxLevel: 25,
    perLevel: 0.02,
    portalHabsOnly: true,
  },
];

export function farmHabs(farm: ei.Backup.ISimulation): Hab[] {
  const habs = [];
  for (const habId of farm.habs!) {
    if (habId === 19) {
      // 19 is the placeholder for unpurchased habs.
      continue;
    }
    if (!isHabId(habId)) {
      throw new Error(`${habId} is not a recognized hab ID`);
    }
    habs.push(habVarieties[habId]);
  }
  return habs;
}

export function farmHabSpaceResearches(farm: ei.Backup.ISimulation): HabSpaceResearchInstance[] {
  return farmResearches(farm, null, availableHabSpaceResearches);
}

export function farmHabSpaces(
  habs: Hab[],
  researches: HabSpaceResearchInstance[],
  artifacts: Artifact[],
  modifier = 1
): number[] {
  let universalMultiplier = 1;
  let portalOnlyMultiplier = 1;
  for (const research of researches) {
    const multiplier = 1 + research.level * research.perLevel;
    if (research.portalHabsOnly) {
      portalOnlyMultiplier *= multiplier;
    } else {
      universalMultiplier *= multiplier;
    }
  }
  const artifactsMultiplier = habSpaceMultiplier(artifacts);
  return habs.map(hab =>
    // Each hab's capacity rounds up individually.
    Math.ceil(
      hab.baseHabSpace *
        universalMultiplier *
        (isPortalHab(hab) ? portalOnlyMultiplier : 1) *
        artifactsMultiplier *
        modifier
    )
  );
}

export function farmCurrentWDLevel(farm: ei.Backup.ISimulation): number {
  const research = farmResearch(farm, null, availableHabSpaceResearches[availableHabSpaceResearches.length - 1]);
  return research ? research.level : 0;
}

// Wormhole Dampening levels required to reach 10B hab space, assuming max
// everything else.
export function requiredWDLevelForEnlightenmentDiamond(artifacts: Artifact[], modifier = 1): number {
  const target = 1e10;
  const finalHab = habVarieties[habVarieties.length - 1];
  const finalHabs = [finalHab, finalHab, finalHab, finalHab];
  const maxResearchesWithoutWD: HabSpaceResearchInstance[] = availableHabSpaceResearches
    .slice(0, availableHabSpaceResearches.length - 1)
    .map(research => ({
      ...research,
      level: research.maxLevel,
    }));
  const maxHabSpaceWithoutWD = farmHabSpaces(finalHabs, maxResearchesWithoutWD, artifacts, modifier).reduce(
    (total, s) => total + s
  );
  if (maxHabSpaceWithoutWD >= target) {
    return 0;
  }
  return Math.ceil((target / maxHabSpaceWithoutWD - 1) / 0.02);
}

const wormholeDampeningLevelPrices = [
  9.398e48, 3.1672e49, 1.06524e50, 3.57692e50, 1.19949e51, 4.024e51, 1.3556e52, 4.5578e52, 1.53e53, 5.12962e53,
  1.723058e54, 5.802e54, 1.95e55, 6.544e55, 2.19362e56, 7.37672e56, 2.482e57, 8.342e57, 2.799e58, 9.3806e58, 3.15786e59,
  1.0625e60, 3.568e60, 1.197e61, 4.0112e61,
];

export function calculateWDLevelsCost(currentLevel: number, targetLevel: number): number {
  currentLevel = Math.max(currentLevel, 0);
  targetLevel = Math.min(targetLevel, wormholeDampeningLevelPrices.length);
  if (currentLevel >= targetLevel) {
    return 0;
  }
  return wormholeDampeningLevelPrices.slice(currentLevel, targetLevel).reduce((total, cost) => total + cost);
}
