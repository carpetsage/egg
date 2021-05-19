import { ei } from 'lib';
import { eggName } from './eggs';

export enum TrophyLevel {
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

export interface ProphecyEggsProgress {
  available: number;
  completed: number;
}

export interface ProphecyEggsProgressAggregate extends ProphecyEggsProgress {
  fromContracts: ProphecyEggsProgressFromContracts;
  fromTrophies: ProphecyEggsProgressFromTrophies;
  fromDailyGifts: ProphecyEggsProgressFromDailyGifts;
}

export interface ProphecyEggsProgressFromContracts extends ProphecyEggsProgress {
  numPEContractsAvailable: number;
  numPEContractsCompleted: number;
}

export interface ProphecyEggsProgressFromTrophies extends ProphecyEggsProgress {
  eggs: ProphecyEggsProgressFromEggTrophies[];
}

export interface ProphecyEggsProgressFromEggTrophies extends ProphecyEggsProgress {
  egg: ei.Egg;
  eggName: string;
  level: TrophyLevel;
  levelName: string;
}

export interface ProphecyEggsProgressFromDailyGifts extends ProphecyEggsProgress {
  numDays: number;
  onMonth: number;
  onDay: number;
}

export interface ProphecyEggsProgressFromContractsParams {
  numPEsAvailable?: number;
  numPEContractsAvailable?: number;
}

export function getNumProphecyEggs(backup: ei.IBackup): number {
  return getProphecyEggsProgress(backup).completed;
}

export function getProphecyEggsProgress(
  backup: ei.IBackup,
  params?: ProphecyEggsProgressFromContractsParams
): ProphecyEggsProgressAggregate {
  const fromContracts = getProphecyEggsProgressFromContracts(backup, params);
  const fromTrophies = getProphecyEggsProgressFromTrophies(backup);
  const fromDailyGifts = getProphecyEggsProgressFromDailyGifts(backup);
  return {
    available: fromContracts.available + fromTrophies.available + fromDailyGifts.available,
    completed: fromContracts.completed + fromTrophies.completed + fromDailyGifts.completed,
    fromContracts,
    fromTrophies,
    fromDailyGifts,
  };
}

export function getProphecyEggsProgressFromContracts(
  backup: ei.IBackup,
  params?: ProphecyEggsProgressFromContractsParams
): ProphecyEggsProgressFromContracts {
  const contracts = (backup?.contracts?.contracts || []).concat(backup?.contracts?.archive || []);
  let numPEsCompleted = 0;
  let numPEContractsCompleted = 0;
  for (const contract of contracts) {
    const props = contract.contract!;
    const league = contract.league || 0;
    let goals = props.goals;
    if (props.goalSets && props.goalSets.length > league) {
      goals = props.goalSets[league].goals;
    }
    if (!goals || goals.length === 0) {
      throw new Error(`no goals found for contract ${props.identifier!}`);
    }
    let isPEContract = false;
    let hasUncompletedPE = false;
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY) {
        isPEContract = true;
        const count = Math.round(goal.rewardAmount!);
        if (i < contract.numGoalsAchieved!) {
          numPEsCompleted += count;
        } else {
          hasUncompletedPE = true;
        }
      }
    }
    if (isPEContract && !hasUncompletedPE) {
      numPEContractsCompleted++;
    }
  }
  return {
    available: params?.numPEsAvailable || 0,
    completed: numPEsCompleted,
    numPEContractsAvailable: params?.numPEContractsAvailable || 0,
    numPEContractsCompleted,
  };
}

export function getProphecyEggsProgressFromTrophies(
  backup: ei.IBackup
): ProphecyEggsProgressFromTrophies {
  const trophyLevels: TrophyLevel[] = backup.game!.eggMedalLevel!;
  if (trophyLevels.length !== 19) {
    throw new Error(`expected trophy levels for 19 eggs, got ${trophyLevels.length}`);
  }
  let totalAvailable = 0;
  let totalCompleted = 0;
  let eggProgresses = <ProphecyEggsProgressFromEggTrophies[]>[];
  for (let i = 0, egg = ei.Egg.EDIBLE; i < 19; i++, egg++) {
    const level = trophyLevels[i];
    if (level > TrophyLevel.Diamond) {
      throw new Error(`unexpected trophy level ${level} for ${ei.Egg[egg]}`);
    }
    let available = 0;
    let completed = 0;
    if (egg === ei.Egg.ENLIGHTENMENT) {
      // Enlightenment egg.
      available += 1;
      if (level >= TrophyLevel.Bronze) {
        completed += 1;
      }
      available += 2;
      if (level >= TrophyLevel.Silver) {
        completed += 2;
      }
      available += 3;
      if (level >= TrophyLevel.Gold) {
        completed += 3;
      }
      available += 5;
      if (level >= TrophyLevel.Platinum) {
        completed += 5;
      }
      available += 10;
      if (level >= TrophyLevel.Diamond) {
        completed += 10;
      }
    } else {
      // All other eggs offer PE only at diamond, or none at all.
      switch (egg) {
        case ei.Egg.EDIBLE:
          available += 5;
          if (level >= TrophyLevel.Diamond) {
            completed += 5;
          }
          break;
        case ei.Egg.SUPERFOOD:
          available += 4;
          if (level >= TrophyLevel.Diamond) {
            completed += 4;
          }
          break;
        case ei.Egg.MEDICAL:
          available += 3;
          if (level >= TrophyLevel.Diamond) {
            completed += 3;
          }
          break;
        case ei.Egg.ROCKET_FUEL:
          available += 2;
          if (level >= TrophyLevel.Diamond) {
            completed += 2;
          }
          break;
        case ei.Egg.SUPER_MATERIAL:
        case ei.Egg.FUSION:
        case ei.Egg.QUANTUM:
        case ei.Egg.IMMORTALITY:
        case ei.Egg.TACHYON:
          available += 1;
          if (level >= TrophyLevel.Diamond) {
            completed += 1;
          }
          break;
      }
    }
    totalAvailable += available;
    totalCompleted += completed;
    eggProgresses.push({
      available,
      completed,
      egg,
      eggName: eggName(egg),
      level,
      levelName: TrophyLevel[level],
    });
  }
  return {
    available: totalAvailable,
    completed: totalCompleted,
    eggs: eggProgresses,
  };
}

export function getProphecyEggsProgressFromDailyGifts(
  backup: ei.IBackup
): ProphecyEggsProgressFromDailyGifts {
  const numDays = backup.game!.numDailyGiftsCollected!;
  const available = 24;
  const completed = Math.min(Math.floor(numDays / 28), available);
  // Call day zero month 1 day 1 because month 0 doesn't make sense.
  let onMonth = 1;
  let onDay = 1;
  if (numDays > 0) {
    onMonth = Math.floor((numDays - 1) / 28) + 1;
    onDay = ((numDays - 1) % 28) + 1;
  }
  return {
    available,
    completed,
    numDays,
    onMonth,
    onDay,
  };
}
