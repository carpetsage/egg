import { ei } from './proto';
import { decodeMessage } from './api';
import contractSeasonProtos from './contractseasons.json';
import seasonContractProtos from './seasoncontracts.json';

const seasonContractList = seasonContractProtos.map(c => decodeMessage(ei.Contract, c.proto) as ei.IContract);

export const contractSeasonList: ei.IContractSeasonInfo[] = (() => {
  return contractSeasonProtos
    .map(c => decodeMessage(ei.ContractSeasonInfo, c.proto) as ei.IContractSeasonInfo)
    .sort((c1, c2) => c1.startTime! - c2.startTime!);
})();

export interface ContractSeasonProgress {
  seasonId: string;
  seasonName: string;
  startTime: number;
  contractsCompleted: number;
  contractsInProgress: number;
  contractsExpired: number;
  availablePE: number;
  completedPE: number;
  startingGrade: ei.Contract.PlayerGrade;
  totalCxp: number;
  cxpLastRewardGiven: number;
  goals: ei.IContractSeasonGoal[];
}

const defaultContractSeasonProgress: ContractSeasonProgress = {
  seasonId: '',
  seasonName: '',
  startTime: 0,
  contractsCompleted: 0,
  contractsInProgress: 0,
  contractsExpired: 0,
  availablePE: 0,
  completedPE: 0,
  startingGrade: ei.Contract.PlayerGrade.GRADE_C,
  totalCxp: 0,
  cxpLastRewardGiven: 0,
  goals: [] as ei.IContractSeasonGoal[],
};
// Convert a season ID into a number: winter_2025 => 2025.0, spring_2025 = 2025.25, etc.
export function parseSeasonId(seasonId: string): number {
  // We expect format season_year
  const split = seasonId.split('_');
  if (split.length == 2) {
    let year = parseInt(split[1]);
    if (isNaN(year)) return -1;
    switch (split[0].toLowerCase()) {
      case 'winter':
        break;
      case 'spring':
        year += 0.25;
        break;
      case 'summer':
        year += 0.5;
        break;
      case 'fall':
        year += 0.75;
        break;
    }
    return year;
  }
  return -1;
}

// Construct a dummy season contract grade goal with a PE and a season max reward
function singlePEGradeGoal(
  grade: ei.Contract.PlayerGrade,
  peCxp: number,
  maxCxp: number
): ei.ContractSeasonInfo.IGoalSet {
  return {
    grade,
    goals: [
      { cxp: peCxp, rewardType: ei.RewardType.EGGS_OF_PROPHECY, rewardAmount: 1 },
      { cxp: maxCxp, rewardType: ei.RewardType.UNKNOWN_REWARD, rewardAmount: 0 },
    ],
  };
}

// Estimate each season is 13 weeks. Compute from the Winter 2025 start time.
const winter2025StartTime = 1734969600;
const secondsIn52Weeks = 52 * 7 * 24 * 60 * 60;
function estimateSeasonStartTime(year: number): number {
  if (year <= 0) {
    // We couldn't parse a year to use
    return 0;
  }
  const yearsAfterWinter2025 = year - 2025;
  return winter2025StartTime + yearsAfterWinter2025 * secondsIn52Weeks;
}

// Default contract season info to use if we're missing one, based on Winter 2025.
// PE goal only - we'll assume each season has one PE.
const defaultContractSeason: ei.IContractSeasonInfo = {
  startTime: winter2025StartTime,
  gradeGoals: [
    singlePEGradeGoal(ei.Contract.PlayerGrade.GRADE_C, 15000, 30000),
    singlePEGradeGoal(ei.Contract.PlayerGrade.GRADE_B, 40000, 80000),
    singlePEGradeGoal(ei.Contract.PlayerGrade.GRADE_A, 98000, 196000),
    singlePEGradeGoal(ei.Contract.PlayerGrade.GRADE_AA, 175000, 300000),
    singlePEGradeGoal(ei.Contract.PlayerGrade.GRADE_AAA, 315000, 630000),
  ],
};

function getDefaultSeasonForYear(year: number): ei.IContractSeasonInfo {
  if (year < 2025) {
    // No rewards for pre-2025 seasons
    return {};
  }
  return {
    ...defaultContractSeason,
    startTime: estimateSeasonStartTime(year),
  };
}

export function getContractSeasonProgress(backup: ei.IBackup, seasonID: string, contracts?: ei.IContractsArchive) {
  const contractSeason =
    contractSeasonList.find(season => season.id === seasonID) || contractSeasonList[contractSeasonList.length - 1];

  const seasonProgress = backup.contracts?.lastCpi?.seasonProgress?.find(sp => sp.seasonId === contractSeason.id);

  const rewardSeason =
    seasonProgress?.cxpLastRewardGiven != null ||
    contractSeason.gradeGoals?.some(gg => Array.isArray(gg.goals)) ||
    false;

  if (!rewardSeason || !seasonProgress || !contractSeason.id) {
    return defaultContractSeasonProgress;
  }

  const seasonYear = parseSeasonId(contractSeason.id);
  const startingGrade =
    seasonProgress?.startingGrade ??
    backup.contracts?.lastCpi?.seasonProgress?.find(season => season.startingGrade != null)?.startingGrade ??
    ei.Contract.PlayerGrade.GRADE_C;
  const goals = contractSeason.gradeGoals?.find(gradeGoal => gradeGoal?.grade === startingGrade)?.goals ?? [];
  const peGoal = goals.find(goal => goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY);
  const availablePE = peGoal?.rewardAmount ?? 0;
  const cxpLastRewardGiven = seasonProgress?.cxpLastRewardGiven ?? seasonProgress?.totalCxp ?? 0;
  const completedPE = cxpLastRewardGiven > (peGoal?.cxp ?? 315000) ? availablePE : 0;

  const { attemptedContracts, completedContracts, expiredContracts } = getSeasonContractsProgress(
    backup,
    seasonID,
    contracts
  );

  const contractSeasonProgress: ContractSeasonProgress = {
    seasonId: contractSeason.id,
    seasonName: contractSeason.name ?? seasonID,
    startTime: contractSeason.startTime ?? estimateSeasonStartTime(seasonYear),
    contractsCompleted: completedContracts.length,
    contractsInProgress: attemptedContracts.length - completedContracts.length,
    contractsExpired: expiredContracts.length,
    availablePE,
    completedPE,
    startingGrade,
    totalCxp: seasonProgress?.totalCxp ?? 0,
    cxpLastRewardGiven: seasonProgress?.cxpLastRewardGiven ?? 0,
    goals,
  };
  return contractSeasonProgress;
}

export function getSeasonContractsProgress(backup: ei.IBackup, seasonID: string, contracts?: ei.IContractsArchive) {
  // find matching season or find latest leason
  const contractSeason =
    contractSeasonList.find(season => season.id === seasonID) || contractSeasonList[contractSeasonList.length - 1];
  if (!contractSeason.id || contracts == null) {
    return { attemptedContracts: [], completedContracts: [], expiredContracts: [] };
  }
  seasonID = contractSeason.id;

  const archive = contracts.archive?.filter(c => c.contract?.seasonId === seasonID) ?? [];
  // dont count in progress contracts that are in the archive
  const inProgress =
    backup.contracts?.contracts?.filter(
      c => c.contract?.seasonId === seasonID && !archive.some(a => a.contract?.identifier === c.contract?.identifier)
    ) ?? [];
  const attemptedContracts = archive.concat(inProgress);

  // counts as completed if it has a score
  const completedContracts = archive.filter(c => c.evaluation?.cxp != null);
  // Find expired contracts that aren't completed/in progress
  const expiredContracts = seasonContractList
    .filter(c => c.seasonId === seasonID)
    .filter(c => (c.expirationTime ?? Infinity) < Date.now() / 1000)
    .filter(c => !attemptedContracts.some(a => a.contract?.identifier === c.identifier));

  return { attemptedContracts, completedContracts, expiredContracts };
}

export function getContractSeasonsProgressData(backup: ei.IBackup, seasonIDs?: string[]) {
  let contractSeasons: ei.IContractSeasonInfo[] = [contractSeasonList[contractSeasonList.length - 1]];

  if (contractSeasonList.filter(season => seasonIDs?.includes(season.id ?? '')).length > 0) {
    contractSeasons = contractSeasonList.filter(season => seasonIDs?.includes(season.id ?? ''));
  } else {
    contractSeasons = contractSeasonList;
  }

  return contractSeasons.map(cs => getContractSeasonProgress(backup, cs.id ?? '')).filter(cs => cs != null);
}
