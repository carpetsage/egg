import { ei } from './proto';

export interface ContractSeasonProgress {
  id: string;
  name: string;
  startTime: number;
  availablePE: number;
  completedPE: number;
  startingGrade: ei.Contract.PlayerGrade;
  totalCxp: number;
  cxpLastRewardGiven: number;
  goals: ei.IContractSeasonGoal[];
}

// Convert a season ID into a number: winter_2025 => 2025.0, spring_2025 = 2025.25, etc.
function parseSeasonId(seasonId: string): number {
  // We expect format season_year
  const split = seasonId.split('_');
  if (split.length == 2) {
    let year = parseInt(split[1]);
    if (isNaN(year)) return -1;
    switch (split[0].toLowerCase()) {
      case 'winter':               break;
      case 'spring': year += 0.25; break;
      case 'summer': year += 0.50; break;
      case 'fall':   year += 0.75; break;
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

export function getContractSeasonProgressData(
  backup: ei.IBackup,
  contractSeasons?: ei.IContractSeasonInfo[]
): ContractSeasonProgress[] {
  const rewardSeasonIds = new Set<string>();

  // Collect the player's progress per season.
  // If we have a cxpLastRewardGiven value then it's a contract season with rewards.
  // Track the best contract grade we've seen too, in case we need it later.
  let pastStartingGrade: ei.Contract.PlayerGrade = ei.Contract.PlayerGrade.GRADE_C;
  const seasonProgressById: { [ id: string ]: ei.ContractPlayerInfo.ISeasonProgress } = {};
  const seasonProgressData = backup.contracts?.lastCpi?.seasonProgress || [];
  for (const seasonProgress of seasonProgressData) {
    if (seasonProgress.seasonId != null) {
      seasonProgressById[seasonProgress.seasonId] = seasonProgress;
      if (seasonProgress.cxpLastRewardGiven != null) {
        rewardSeasonIds.add(seasonProgress.seasonId);
      }
      if (seasonProgress.startingGrade != null && seasonProgress.startingGrade > pastStartingGrade) {
        pastStartingGrade = seasonProgress.startingGrade;
      }
    }
  }

  // Contract seasons with rewards by ID
  const contractSeasonsById: { [ id: string ]: ei.IContractSeasonInfo } = {};
  for (const season of contractSeasons || []) {
    if (season.id != null) {
      contractSeasonsById[season.id] = season;
      // Do we have a non-empty list of goals for any grade?
      if (season.gradeGoals != null && season.gradeGoals.some(
        gradeGoal => Array.isArray(gradeGoal.goals) && gradeGoal.goals.length > 0)) {
        rewardSeasonIds.add(season.id);
      }
    }
  }

  // Combine the reward seasons from both lists.
  // - If we have both season progress and a season definition, count available & completed eggs from the goals.
  //   Take the max number of PEs from any grade's goals (although we'd expect them to all be the same).
  // - If we have a season definition but no progress, count available eggs but assume none completed. Use the
  //   highest contract grade we saw in other season progress, else grade C.
  // - If we have progress for a season after Winter 2025 but no season definition, assume it has a single PE
  //   with the same CXP requirements as Winter 2025. If it's before Winter 2025 assume no PEs.
  const result: ContractSeasonProgress[] = [];
  for (const seasonId of rewardSeasonIds) {
    const seasonYear = parseSeasonId(seasonId);
    const contractSeason = contractSeasonsById[seasonId] ?? getDefaultSeasonForYear(seasonYear);
    const seasonProgress = seasonProgressById[seasonId];

    let availablePE = 0;
    let completedPE = 0;
    let goals: ei.IContractSeasonGoal[] = [];
    let startingGrade: ei.Contract.PlayerGrade = ei.Contract.PlayerGrade.GRADE_UNSET;
    if (contractSeason.gradeGoals != null) {
      // Maximum number of PEs available for any grade
      const allGradesPECounts = contractSeason.gradeGoals.map(gradeGoal =>
        (gradeGoal.goals || [])
          .filter(goal => goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY)
          .reduce((total, goal) => total + (goal.rewardAmount ?? 1), 0)
      ) ?? [0];
      availablePE = Math.max(...allGradesPECounts);

      startingGrade = seasonProgress?.startingGrade ?? pastStartingGrade;
      goals = contractSeason.gradeGoals.find(gradeGoal => gradeGoal?.grade === startingGrade)?.goals ?? [];

      // PEs obtained
      if (seasonProgress != null) {
        const cxpLastRewardGiven = seasonProgress.cxpLastRewardGiven ?? seasonProgress.totalCxp ?? 0;
        if (cxpLastRewardGiven > 0) {
          completedPE = goals
            .filter(goal => goal.cxp != null && goal.cxp <= cxpLastRewardGiven &&
              goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY)
            .reduce((total, goal) => total + (goal.rewardAmount ?? 1), 0);
        }
      }
    }

    const contractSeasonProgress: ContractSeasonProgress = {
      id: seasonId,
      name: contractSeason.name ?? seasonId,
      startTime: contractSeason.startTime ?? estimateSeasonStartTime(seasonYear),
      availablePE,
      completedPE,
      startingGrade,
      totalCxp: seasonProgress?.totalCxp ?? 0,
      cxpLastRewardGiven: seasonProgress?.cxpLastRewardGiven ?? 0,
      goals,
    };
    result.push(contractSeasonProgress);
  }
  result.sort((a, b) => (a.startTime - b.startTime));
  return result;
}
