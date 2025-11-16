import { ei, getNumTruthEggs } from 'lib';
import { prophecyEggBonusFromArtifacts, soulEggBonusFromArtifacts } from '../effects';
import { Artifact, Research } from '../types';
import { farmResearch } from './common';
import { accountProphecyEggsCount } from './prophecy_eggs';

const baseSoulEggBonus = 0.1;
const soulFoodResearch: Research = {
  id: 'soul_eggs',
  name: 'Soul Food',
  maxLevel: 140,
  perLevel: 0.01,
};
const baseProphecyEggBonus = 0.05;
const prophecyBonusResearch: Research = {
  id: 'prophecy_bonus',
  name: 'Prophecy Bonus',
  maxLevel: 5,
  perLevel: 0.01,
};

export function farmEarningBonus(
  backup: ei.IBackup,
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame,
  artifacts: Artifact[]
): number {
  const truthEggsCount = getNumTruthEggs(backup);
  const soulEggsCount = (progress.soulEggsD || progress.soulEggs || 0) as number;
  const prophecyEggsCount = backup.game?.eggsOfProphecy ?? accountProphecyEggsCount(backup);
  const soulEggBonus = farmSoulEggBonus(farm, progress, artifacts);
  const prophecyEggBonus = farmProphecyEggBonus(farm, progress, artifacts);
  return soulEggsCount * soulEggBonus * (1 + prophecyEggBonus) ** prophecyEggsCount * 1.01 ** truthEggsCount;
}

function farmSoulEggBonus(farm: ei.Backup.ISimulation, progress: ei.Backup.IGame, artifacts: Artifact[]): number {
  const research = farmResearch(farm, progress, soulFoodResearch);
  return baseSoulEggBonus + (research ? research.perLevel * research.level : 0) + soulEggBonusFromArtifacts(artifacts);
}

function farmProphecyEggBonus(farm: ei.Backup.ISimulation, progress: ei.Backup.IGame, artifacts: Artifact[]): number {
  const research = farmResearch(farm, progress, prophecyBonusResearch);
  return (
    baseProphecyEggBonus +
    (research ? research.perLevel * research.level : 0) +
    prophecyEggBonusFromArtifacts(artifacts)
  );
}
