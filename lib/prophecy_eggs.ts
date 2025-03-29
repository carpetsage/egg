import { ei } from './proto';
import { eggName } from './eggs';
import { getContractSeasonProgressData } from './contract_seasons';
import { getContractGoals } from './contracts';

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
  fromContractSeasons: ProphecyEggsProgressFromContractSeasons;
  fromTrophies: ProphecyEggsProgressFromTrophies;
  fromDailyGifts: ProphecyEggsProgressFromDailyGifts;
}

export interface ProphecyEggsProgressFromContracts extends ProphecyEggsProgress {
  numPEContractsAvailable: number;
  numPEContractsCompleted: number;
}

export interface ProphecyEggsProgressFromContractSeasons extends ProphecyEggsProgress {
  numPESeasonsAvailable: number;
  numPESeasonsCompleted: number;
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
  contractSeasons?: ei.IContractSeasonInfo[];
}

export function getNumProphecyEggs(backup: ei.IBackup): number {
  return getProphecyEggsProgress(backup).completed;
}

export function getProphecyEggsProgress(
  backup: ei.IBackup,
  params?: ProphecyEggsProgressFromContractsParams
): ProphecyEggsProgressAggregate {
  const completed = backup.game!.eggsOfProphecy!;
  const fromContracts = getProphecyEggsProgressFromContracts(backup, params);
  const fromContractSeasons = getProphecyEggsProgressFromContractSeasons(backup);
  const fromTrophies = getProphecyEggsProgressFromTrophies(backup);
  const fromDailyGifts = getProphecyEggsProgressFromDailyGifts(backup);
  // Sometimes when a player has started a half-finished legacy contract, and
  // they have completed a goal that wasn't a PE goal the last time but has
  // turned into a PE goal this time, the PE reward should be reimbursed, but
  // the PE count may not update immediately. It may update at some random
  // point. In this case, to best avoid confusion, we use the reported total
  // backup.game.eggsOfProphecy, and deduce the number of contract PEs from
  // that.
  //
  // See the following bug report:
  // https://discord.com/channels/869885242801029150/869945876313944074/914077000824659979
  // https://discord.com/channels/@me/849156772999462922/914078132309467196
  const fromContractsCompleted =
    completed - fromTrophies.completed - fromDailyGifts.completed - fromContractSeasons.completed;
  if (fromContractsCompleted !== fromContracts.completed) {
    console.warn(
      `Discrepancy detected: ` +
        `${fromContracts.completed} PEs from contracts according to contract archive, ` +
        `${fromContractsCompleted} PEs from contracts according to backup.game.eggsOfProphecy`
    );
    fromContracts.completed = fromContractsCompleted;
  }
  return {
    available:
      fromContracts.available + fromTrophies.available + fromDailyGifts.available + fromContractSeasons.available,
    completed,
    fromContracts,
    fromContractSeasons,
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
    const grade = contract.grade || ei.Contract.PlayerGrade.GRADE_C;
    const goals = getContractGoals({ contract: props, grade, league });
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

export function getProphecyEggsProgressFromContractSeasons(
  backup: ei.IBackup,
  contractSeasonIDs?: string[]
): ProphecyEggsProgressFromContractSeasons {
  const seasonProgressData = getContractSeasonProgressData(backup, contractSeasonIDs);

  let numPEsAvailable = 0;
  let numPEsCompleted = 0;
  let numPESeasonsAvailable = 0;
  let numPESeasonsCompleted = 0;
  const now = Math.floor(Date.now() / 1000);
  for (const season of seasonProgressData) {
    if (season.startTime > now) {
      // Don't count PEs from future seasons.
      continue;
    }
    numPEsAvailable += season.availablePE;
    numPEsCompleted += season.completedPE;
    if (season.availablePE > 0) {
      ++numPESeasonsAvailable;
      if (season.completedPE >= season.availablePE) ++numPESeasonsCompleted;
    }
  }

  return {
    available: numPEsAvailable,
    completed: numPEsCompleted,
    numPESeasonsAvailable,
    numPESeasonsCompleted,
  };
}

export function getProphecyEggsProgressFromTrophies(backup: ei.IBackup): ProphecyEggsProgressFromTrophies {
  const trophyLevels: TrophyLevel[] = backup.game!.eggMedalLevel!;
  if (trophyLevels.length !== 19) {
    throw new Error(`expected trophy levels for 19 eggs, got ${trophyLevels.length}`);
  }
  let totalAvailable = 0;
  let totalCompleted = 0;
  const eggProgresses = <ProphecyEggsProgressFromEggTrophies[]>[];
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

export function getProphecyEggsProgressFromDailyGifts(backup: ei.IBackup): ProphecyEggsProgressFromDailyGifts {
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
