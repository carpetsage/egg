import {
  Artifact,
  ei,
  Farm,
  formatEIValue,
  getNumProphecyEggs,
  getNumSoulEggs,
  Stone,
  uint8ArrayToBinaryString,
} from 'lib';

import {
  IArtifact as ISandboxArtifact,
  Builds,
  IBuild,
  IBuilds,
  IConfig,
  IStone as ISandboxStone,
} from './schema';

export function farmToSandboxConfig(farm: Farm): IBuilds {
  const backup = farm.backup;
  if (farm.soulEggBonusResearches.length !== 1) {
    throw new Error(`unexpected soul food progress from save, please consult the developer`);
  }
  const soulFoodResearch = farm.soulEggBonusResearches[0];
  const missingSoulFood = soulFoodResearch.maxLevel - soulFoodResearch.level;
  if (farm.prophecyEggBonusResearches.length !== 1) {
    throw new Error(`unexpected prophecy bonus progress from save, please consult the developer`);
  }
  const prophecyBonusResearch = farm.prophecyEggBonusResearches[0];
  const missingProphecyBonus = prophecyBonusResearch.maxLevel - prophecyBonusResearch.level;
  const epicMultiplierResearch =
    farm.maxRunningChickenBonusResearches[farm.maxRunningChickenBonusResearches.length - 1];
  const missingEpicMultiplier = epicMultiplierResearch.maxLevel - epicMultiplierResearch.level;
  const config: IConfig = {
    prophecyEggs: getNumProphecyEggs(backup),
    soulEggs: getNumSoulEggs(backup),
    soulEggsInput: formatEIValue(getNumSoulEggs(backup), { decimals: 6 }),
    isEnlightenment: farm.egg === ei.Egg.ENLIGHTENMENT,

    missingSoulFood,
    missingProphecyBonus,
    missingEpicMultiplier,

    birdFeedActive: true,
    tachyonPrismActive: true,
    soulBeaconActive: true,
    boostBeaconActive: true,
  };
  const artifacts = farm.artifactSet.artifacts.map(artifactToSandboxArtifact);
  while (artifacts.length < 4) {
    artifacts.push({
      isEmpty: true,
      stones: stonesToSandboxStones([]),
    });
  }
  const builds: IBuild[] = [{ artifacts }];
  return {
    builds,
    config,
  };
}

function artifactToSandboxArtifact(artifact: Artifact): ISandboxArtifact {
  return {
    afxId: artifact.afxId,
    afxLevel: artifact.afxLevel,
    afxRarity: artifact.afxRarity,
    stones: stonesToSandboxStones(artifact.stones),
  };
}

function stonesToSandboxStones(stones: Stone[]): ISandboxStone[] {
  const sandboxStones: ISandboxStone[] = stones.map(stone => ({
    afxId: stone.afxId,
    afxLevel: stone.afxLevel,
  }));
  while (sandboxStones.length < 3) {
    sandboxStones.push({ isEmpty: true });
  }
  return sandboxStones;
}

export function farmToSandboxURL(farm: Farm): string {
  const buf = Builds.encode(farmToSandboxConfig(farm)).finish();
  const encoded = btoa(uint8ArrayToBinaryString(buf));
  return `/artifact-sandbox/#/b/${encodeURIComponent(encoded)}`;
}
