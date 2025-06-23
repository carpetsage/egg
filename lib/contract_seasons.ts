import { ei } from './proto';
import { decodeMessage } from './api';
import contractSeasonProtos from './contractseasons.json';
import seasonContractProtos from './seasoncontracts.json';

// ====================================================================================
// DATA INITIALIZATION
// ====================================================================================

/**
 * List of all contract seasons, decoded from protobuf and sorted by start time
 */
export const contractSeasons: Map<string, ei.IContractSeasonInfo> = (() => {
  const seasons = contractSeasonProtos
    .map(c => {
      const seasoninfo = decodeMessage(ei.ContractSeasonInfo, c.proto) as ei.IContractSeasonInfo;
      return [seasoninfo.id ?? '', seasoninfo] as const;
    })
    .filter(c => c[0] !== '')
    .sort((c1, c2) => (c1[1].startTime ?? 0) - (c2[1].startTime ?? 0));

  return new Map(seasons);
})();

/**
 * List of all season contracts, decoded from protobuf
 */
const seasonContractList = seasonContractProtos.map(c => decodeMessage(ei.Contract, c.proto) as ei.IContract);

// ====================================================================================
// TYPE DEFINITIONS
// ====================================================================================

/**
 * Progress data for a contract season including completion statistics and rewards
 */
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

/**
 * Default values for contract season progress when no data is available
 */
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

// ====================================================================================
// SEASON ID PARSING
// ====================================================================================

/**
 * Convert a season ID into a numeric representation for sorting/comparison
 * @param seasonId Format: season_year (e.g., winter_2025, spring_2025)
 * @returns Numeric value where winter=0.0, spring=0.25, summer=0.5, fall=0.75
 *          Returns -1 if parsing fails
 * @example
 * parseSeasonId("winter_2025") => 2025.0
 * parseSeasonId("spring_2025") => 2025.25
 */
export function parseSeasonId(seasonId: string): number {
  const split = seasonId.split('_');
  if (split.length !== 2) {
    return 0;
  }

  const year = parseInt(split[1]);
  if (isNaN(year)) {
    return 0;
  }

  // Map season names to fractional values for ordering
  const seasonOffsets: Record<string, number> = {
    winter: 0.0,
    spring: 0.25,
    summer: 0.5,
    fall: 0.75,
  };

  const seasonOffset = seasonOffsets[split[0].toLowerCase()];
  return seasonOffset !== undefined ? year + seasonOffset : -1;
}

// ====================================================================================
// SEASON DEFAULTS AND ESTIMATION
// ====================================================================================

// Constants for season estimation based on Winter 2025 as reference point
const WINTER_2025_START_TIME = 1734969600;
const SECONDS_IN_52_WEEKS = 52 * 7 * 24 * 60 * 60;

/**
 * Estimate season start time based on a reference year
 * Assumes each season cycle is 52 weeks (one year)
 * @param year Target year to estimate
 * @returns Estimated Unix timestamp for season start
 */
function estimateSeasonStartTime(year: number): number {
  if (year <= 0) {
    return 0;
  }
  const yearsAfterWinter2025 = year - 2025;
  return WINTER_2025_START_TIME + yearsAfterWinter2025 * SECONDS_IN_52_WEEKS;
}

// ====================================================================================
// MAIN PROGRESS CALCULATION FUNCTIONS
// ====================================================================================

/**
 * Calculate comprehensive progress data for a specific contract season
 * @param backup Player backup data containing progress information
 * @param seasonID Target season identifier
 * @param contracts Optional contracts archive for additional data
 * @returns Complete season progress including rewards and contract statistics
 */
export function getContractSeasonProgress(backup: ei.IBackup, seasonID: string, contracts?: ei.IContractsArchive) {
  // Find the target season or default to the latest season
  const contractSeason = contractSeasons.get(seasonID) || Array.from(contractSeasons.values()).at(-1);

  // Extract season progress from backup data
  const seasonProgress = backup.contracts?.lastCpi?.seasonProgress?.find(sp => sp.seasonId === contractSeason?.id);

  // Determine if this is a reward-bearing season (has CXP rewards or goal structure)
  const rewardSeason =
    seasonProgress?.cxpLastRewardGiven != null ||
    contractSeason?.gradeGoals?.some(gg => Array.isArray(gg.goals)) ||
    false;

  // Return default progress if season doesn't have rewards or required data
  if (!rewardSeason || !contractSeason?.id) {
    return defaultContractSeasonProgress;
  }

  const seasonYear = parseSeasonId(contractSeason?.id);

  // Determine player's starting grade for the season
  const startingGrade =
    seasonProgress?.startingGrade ??
    backup.contracts?.lastCpi?.seasonProgress?.find(season => season.startingGrade != null)?.startingGrade ??
    ei.Contract.PlayerGrade.GRADE_C;

  // Extract goals for the player's grade level
  const goals = contractSeason.gradeGoals?.find(gradeGoal => gradeGoal?.grade === startingGrade)?.goals ?? [];
  const peGoal = goals.find(goal => goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY);

  // Calculate PE rewards
  const availablePE = peGoal?.rewardAmount ?? 0;
  const cxpLastRewardGiven = seasonProgress?.cxpLastRewardGiven ?? seasonProgress?.totalCxp ?? 0;
  const completedPE = cxpLastRewardGiven >= (peGoal?.cxp ?? Infinity) ? availablePE : 0;

  // Get contract completion statistics
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

/**
 * Analyze contract progress within a specific season
 * @param backup Player backup data
 * @param seasonID Target season identifier
 * @param contracts Optional contracts archive
 * @returns Object containing arrays of attempted, completed, and expired contracts
 */
export function getSeasonContractsProgress(backup: ei.IBackup, seasonID: string, contracts?: ei.IContractsArchive) {
  // Find the target season or default to latest
  const contractSeason = contractSeasons.get(seasonID) || Array.from(contractSeasons.values()).at(-1);

  if (!contractSeason?.id || contracts == null) {
    return { attemptedContracts: [], completedContracts: [], expiredContracts: [] };
  }

  seasonID = contractSeason.id;

  // Get archived contracts for this season
  const archive = contracts.archive?.filter(c => c.contract?.seasonId === seasonID) ?? [];

  // Get in-progress contracts that aren't already in the archive
  const inProgress =
    backup.contracts?.contracts?.filter(
      c => c.contract?.seasonId === seasonID && !archive.some(a => a.contract?.identifier === c.contract?.identifier)
    ) ?? [];

  const attemptedContracts = archive.concat(inProgress);

  // Contracts are completed if they have an evaluation score
  const completedContracts = archive.filter(c => c.evaluation?.cxp != null);

  // Find expired contracts that weren't attempted
  const currentTime = Date.now() / 1000;
  const expiredContracts = seasonContractList
    .filter(c => c.seasonId === seasonID)
    .filter(c => (c.expirationTime ?? Infinity) < currentTime)
    .filter(c => !attemptedContracts.some(a => a.contract?.identifier === c.identifier));

  return { attemptedContracts, completedContracts, expiredContracts };
}

/**
 * Get progress data for multiple contract seasons
 * @param backup Player backup data
 * @param seasonIDs Optional array of specific season IDs to process
 * @returns Array of contract season progress data
 */
export function getContractSeasonsProgressData(backup: ei.IBackup, seasonIDs?: string[]) {
  let seasonsToProcess: ei.IContractSeasonInfo[];

  // If specific season IDs are provided and exist, use those; otherwise use all seasons
  if (seasonIDs && seasonIDs.length > 0) {
    const requestedSeasons = seasonIDs
      .map(id => contractSeasons.get(id))
      .filter((season): season is ei.IContractSeasonInfo => season !== undefined);

    if (requestedSeasons.length > 0) {
      seasonsToProcess = requestedSeasons;
    } else {
      // Default to latest season if no valid IDs provided
      const latestSeason = Array.from(contractSeasons.values()).at(-1);
      seasonsToProcess = latestSeason ? [latestSeason] : [];
    }
  } else {
    // Use all seasons
    seasonsToProcess = Array.from(contractSeasons.values());
  }

  return seasonsToProcess.map(cs => getContractSeasonProgress(backup, cs.id ?? '')).filter(cs => cs != null);
}
