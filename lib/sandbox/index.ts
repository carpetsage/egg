import { uint8ArrayToBinaryString } from '../api';
import { Artifact, ArtifactSet, Stone } from '../artifacts';
import { getNumSoulEggs } from '../earning_bonus';
import { Farm } from '../farm';
import { getNumProphecyEggs } from '../prophecy_eggs';
import { ei } from '../proto';
import { formatEIValue } from '../units';

import { IArtifact as ISandboxArtifact, Builds, IBuild, IBuilds, IConfig, IStone as ISandboxStone } from './schema';

type FarmToSandboxConfigOverride = {
  isEnlightenment?: boolean;
  proPermit?: boolean;
  artifactSet?: ArtifactSet;
  birdFeedActive?: boolean;
  tachyonPrismActive?: boolean;
  soulBeaconActive?: boolean;
  boostBeaconActive?: boolean;
};

export function farmToSandboxConfig(farm: Farm, override?: FarmToSandboxConfigOverride): IBuilds {
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
    isEnlightenment: override?.isEnlightenment ?? farm.egg === ei.Egg.ENLIGHTENMENT,

    missingSoulFood,
    missingProphecyBonus,
    missingEpicMultiplier,

    birdFeedActive: override?.birdFeedActive ?? true,
    tachyonPrismActive: override?.tachyonPrismActive ?? true,
    soulBeaconActive: override?.soulBeaconActive ?? true,
    boostBeaconActive: override?.boostBeaconActive ?? true,
    proPermit: override?.proPermit ?? true,
  };
  const artifacts = (override?.artifactSet ?? farm.artifactSet).artifacts.map(artifactToSandboxArtifact);
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

export function farmToSandboxURL(farm: Farm, override?: FarmToSandboxConfigOverride): string {
  const buf = Builds.encode(farmToSandboxConfig(farm, override)).finish();
  const encoded = btoa(uint8ArrayToBinaryString(buf));
  const relURL = `/artifact-sandbox/#/b/${encodeURIComponent(encoded)}`;
  // Use the canonical deployed URL during development since there wouldn't be a
  // sandbox instance served from the same origin durating development.
  return import.meta.env.PROD ? relURL : 'https://wasmegg-carpet.netlify.app' + relURL;
}
