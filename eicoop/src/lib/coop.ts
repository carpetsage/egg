import dayjs, { Dayjs } from 'dayjs';

import {
  ArtifactSet,
  ContractLeague,
  ei,
  FarmerRole,
  requestQueryCoop,
  soulPowerToFarmerRole,
  requestCoopStatusBasic,
  getLocalStorage,
  getContractGoals,
} from 'lib';
import { ContractLeagueStatus, getContractFromPlayerSave } from './contract';
import { SortedContractList } from './contractList';

// League constants
const COOP_LEAGUE_DIVIDER_EB = 1e13; // 10T%
const COOP_LEAGUE_DEFINITELY_STANDARD_EB = 1e12;
const COOP_LEAGUE_DEFINITELY_ELITE_EB = 1e16;

export class CoopStatus {
  contractId: string;
  creatorId: string;
  creatorName: string | null;
  contract: ei.IContract | null;
  coopCode: string;
  isPublic: boolean;
  eggsLaid: number;
  eggsPerHour: number;
  secondsRemaining: number;
  projectedEggsLaid: number;
  totalEarningsBoost: number;
  totalEggLayingRateBoost: number;
  highestEarningBonusPercentage: number;
  contributors: Contributor[];
  creator: Contributor | null;
  // Since shortly before the release v1.23, contributorIds are encrypted, but
  // creatorId is not, making it impossible to determine the creator.
  cannotDetermineCreator: boolean;
  league: ContractLeague | null;
  grade: ei.Contract.PlayerGrade | null;
  goals: ei.Contract.IGoal[] | null;
  leagueStatus: ContractLeagueStatus | null;
  refreshTime: Dayjs;
  expirationTime: Dayjs;
  eggsLaidOfflineAdjusted: number;
  allGoalsAchieved: boolean;
  secondsSinceAllGoalsAchieved?: number | null;
  status: string;

  constructor(cs: ei.IContractCoopStatusResponse) {
    this.contractId = cs.contractIdentifier!;
    this.contract = null;
    this.coopCode = cs.coopIdentifier!;
    this.isPublic = cs.public!;
    this.eggsLaid = cs.totalAmount!;
    this.creatorId = cs.creatorId!;
    this.creatorName = null;
    this.allGoalsAchieved = cs.allGoalsAchieved ?? false;
    this.secondsSinceAllGoalsAchieved = cs.secondsSinceAllGoalsAchieved;
    this.status = this.allGoalsAchieved ? 'SUCCESS' : 'ACTIVE';
    this.contributors = (cs.contributors || []).map(c => new Contributor(c));
    this.highestEarningBonusPercentage = Math.max(...this.contributors.map(c => c.earningBonusPercentage));
    for (const contributor of this.contributors) {
      contributor.soulMirrorMultiplier =
        (100 + this.highestEarningBonusPercentage) / (100 + contributor.earningBonusPercentage);
    }
    this.eggsPerHour = this.contributors.reduce((sum, c) => sum + c.eggsPerHour, 0);
    this.secondsRemaining = cs.secondsRemaining!;
    this.projectedEggsLaid = this.eggsLaid + (this.eggsPerHour * Math.max(this.secondsRemaining, 0)) / 3600;
    this.totalEarningsBoost = this.contributors.reduce((sum, c) => sum + c.earningsBoost, 0);
    this.totalEggLayingRateBoost = this.contributors.reduce((sum, c) => sum + c.eggLayingRateBoost, 0);
    this.creator = null;
    this.cannotDetermineCreator = false;
    for (const contributor of this.contributors) {
      if (contributor.id === cs.creatorId) {
        this.creator = contributor;
      }
    }
    if (this.creator === null && cs.creatorId) {
      // Heuristics for encrypted ID.
      const isEncrypted = (id: string) => !id.startsWith('EI') || id.length >= 30;
      this.cannotDetermineCreator = !isEncrypted(cs.creatorId) && this.contributors.some(c => isEncrypted(c.id));
    }

    this.grade = cs.grade ?? null;
    this.league = null;
    this.goals = null;
    this.leagueStatus = null;
    this.refreshTime = dayjs();
    this.expirationTime = this.refreshTime.add(cs.secondsRemaining!, 'second');
    this.eggsLaidOfflineAdjusted = this.eggsLaid;
    for (const contributor of this.contributors) {
      this.eggsLaidOfflineAdjusted += contributor.offlineEggs;
    }
  }

  async resolveContract({
    store,
    knownContract,
    knownLeague,
    knownGrade,
  }: {
    store: SortedContractList;
    knownContract?: ei.IContract;
    knownLeague?: ContractLeague;
    knownGrade?: ei.Contract.PlayerGrade;
  }): Promise<void> {
    const contract = knownContract || store.get(this.contractId, this.expirationTime.unix());
    if (contract) {
      this.contract = contract;
      // set league if we didn't set grade
      this.league = this.grade ? null : await this.resolveLeague(knownLeague);
    } else {
      if (this.contributors.length === 0) {
        throw new Error(`No contributors found in ${this.contractId}:${this.coopCode}, cannot resolve contract info.`);
      }
      const userId = getLocalStorage('userId', '/_') || '';
      const result = await getContractFromPlayerSave(userId, this.contractId);
      if (!result) {
        throw new Error(`Contract ${this.contractId} not found in user's save.`);
      }
      this.contract = result.contract;
      this.league = result.league ?? 1;
      this.grade = result.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET;
      this.creatorName = result.creatorName;
    }
    this.goals = getContractGoals({ contract: this.contract, grade: this.grade ?? 1, league: this.league ?? 0 });

    this.leagueStatus = new ContractLeagueStatus(
      this.eggsLaid,
      this.eggsPerHour,
      this.eggsLaidOfflineAdjusted,
      this.secondsRemaining,
      this.goals,
      this.status
    );

    // After resolving the league status we know what the final target is,
    // so we adjust our offline eggs to keep it within bounds
    this.eggsLaidOfflineAdjusted = Math.min(this.eggsLaidOfflineAdjusted, this.leagueStatus.finalTarget);
  }

  async resolveGrade(knownGrade?: ei.Contract.PlayerGrade): Promise<ei.Contract.PlayerGrade> {
    if (knownGrade !== undefined) {
      this.grade = knownGrade;
      return this.grade;
    }
    // empty coop / before grades
    if (this.contributors.length === 0 || this.expirationTime < dayjs('2023-05-01 00:00Z')) {
      this.grade = ei.Contract.PlayerGrade.GRADE_C;
      return this.grade;
    }
    try {
      const { grade, status } = await requestCoopStatusBasic(this.contractId, this.coopCode);
      // grade from response or AAA
      this.grade = grade ? grade : ei.Contract.PlayerGrade.GRADE_AAA;
      // status from response or ACTIVE
      console.log(status);
      if (this.secondsRemaining > 0) {
        this.status = status ? ei.ContractCoopStatusResponse.Status[status] : 'ACTIVE';
      } else {
        this.status = status ? ei.ContractCoopStatusResponse.Status[status] : 'COMPLETE';
      }
      return this.grade;
    } catch (e) {
      console.error(`failed to determine grade, falling back to AAA: ${e}`);
    }
    // If all else fails just go with AAA
    this.grade = ei.Contract.PlayerGrade.GRADE_AAA;
    return this.grade;
  }

  async resolveLeague(knownLeague?: ContractLeague): Promise<ContractLeague> {
    if (knownLeague !== undefined) {
      this.league = knownLeague;
      return this.league;
    }

    if (this.contributors.length === 0) {
      // Ghost coop, don't care.
      this.league = ContractLeague.Elite;
      return this.league;
    }

    // Heuristics.
    let belowThresholdCount = 0;
    let aboveThresholdCount = 0;
    for (const contributor of this.contributors.reverse()) {
      const eb = contributor.earningBonusPercentage;
      if (eb < COOP_LEAGUE_DEFINITELY_STANDARD_EB) {
        this.league = ContractLeague.Standard;
        return this.league;
      }
      if (eb > COOP_LEAGUE_DEFINITELY_ELITE_EB) {
        this.league = ContractLeague.Elite;
        return this.league;
      }
      if (eb < COOP_LEAGUE_DIVIDER_EB) {
        belowThresholdCount++;
      } else {
        aboveThresholdCount++;
      }
    }
    const heuristicLeague = aboveThresholdCount > belowThresholdCount ? ContractLeague.Elite : ContractLeague.Standard;

    try {
      // Query /ei/query_coop to see if elite league is the wrong league.
      const queryCoopResponse = await requestQueryCoop(this.contractId, this.coopCode, 0, undefined, undefined);
      this.league = queryCoopResponse.differentLeague ? ContractLeague.Standard : ContractLeague.Elite;
      return this.league;
    } catch (e) {
      console.error(`failed to query coop ${this.contractId}:${this.coopCode}: ${e}`);
      this.league = heuristicLeague;
      return this.league;
    }
  }
}

export class Contributor {
  id: string;
  name: string;
  eggsLaid: number;
  eggsPerHour: number;
  earningBonusPercentage: number;
  soulMirrorMultiplier = 1;
  farmerRole: FarmerRole;
  tokens: number;
  isActive: boolean;
  autojoined: boolean;
  isTimeCheating: boolean;
  isLeeching: boolean; // New in v1.20.8
  earningsBoost: number;
  eggLayingRateBoost: number;
  // New in v1.20.8, not available for coops before that or (maybe) contributors
  // on lower app versions.
  tokensSpent: number | null;
  hourlyLayingRateUncapped: number | null;
  projectedHourlyLayingRateUncappedAtFullHabs: number | null;
  hourlyShippingCapacity: number | null;
  farmPopulation: number | null;
  farmCapacity: number | null;
  internalHatcheryRatePerMinPerHab: number | null;
  // New in v1.23
  farmShared: boolean;
  artifacts: ArtifactSet;
  boosts: ei.Backup.IActiveBoost[];
  // New in v1.24
  offlineSeconds: number;
  offlineTimeStr: string;
  offlineEggs: number;
  recentlyActive: boolean;
  finalized: boolean;

  constructor(contributor: ei.ContractCoopStatusResponse.IContributionInfo) {
    this.id = contributor.userId!;
    this.name = contributor.userName!;
    this.eggsLaid = contributor.contributionAmount!;
    this.eggsPerHour = contributor.contributionRate! * 3600;
    this.earningBonusPercentage = Math.pow(10, contributor.soulPower!) * 100;
    this.farmerRole = soulPowerToFarmerRole(contributor.soulPower!);
    this.tokens = contributor.boostTokens ?? contributor.farmInfo?.boostTokensOnHand ?? 0;
    this.recentlyActive = contributor.recentlyActive ?? false;
    this.finalized = contributor.finalized ?? false;
    this.autojoined = contributor.autojoined ?? false;
    this.isActive = contributor.active!;
    this.isTimeCheating = contributor.timeCheatDetected!;
    this.isLeeching = contributor.leech!;
    this.earningsBoost = 0;
    this.eggLayingRateBoost = 0;
    if (Array.isArray(contributor.buffHistory) && contributor.buffHistory.length > 0) {
      const currentBuff = contributor.buffHistory[contributor.buffHistory.length - 1];
      this.earningsBoost = currentBuff.earnings! - 1;
      this.eggLayingRateBoost = currentBuff.eggLayingRate! - 1;
    }

    this.tokensSpent = isValue(contributor.boostTokensSpent) ? contributor.boostTokensSpent : null;
    this.hourlyLayingRateUncapped = null;
    this.projectedHourlyLayingRateUncappedAtFullHabs = null;
    this.hourlyShippingCapacity = null;
    this.farmPopulation = null;
    this.farmCapacity = null;
    this.internalHatcheryRatePerMinPerHab = null;
    const params = contributor.productionParams;
    if (params) {
      if (isValue(params.elr) && isValue(params.farmPopulation)) {
        this.hourlyLayingRateUncapped = params.elr * params.farmPopulation * 3600;
        if (isValue(params.farmCapacity)) {
          this.projectedHourlyLayingRateUncappedAtFullHabs = params.elr * params.farmCapacity * 3600;
        }
      }
      if (isValue(params.sr)) {
        this.hourlyShippingCapacity = params.sr * 3600;
      }
      if (isValue(params.farmPopulation)) {
        this.farmPopulation = params.farmPopulation;
      }
      if (isValue(params.farmCapacity)) {
        this.farmCapacity = params.farmCapacity;
      }
      if (isValue(params.ihr)) {
        this.internalHatcheryRatePerMinPerHab = params.ihr * 60;
      }
    }

    this.farmShared = !!contributor.farmInfo;
    this.artifacts = new ArtifactSet(contributor.farmInfo?.equippedArtifacts ?? [], false);
    this.boosts = (contributor.farmInfo?.activeBoosts ?? []).filter(
      boost => !!boost.boostId && (boost.timeRemaining ?? 0) > 0
    );

    // when a player is not sharing the farm, we assume there are no offline eggs (conservative)
    this.offlineSeconds = -(contributor.farmInfo?.timestamp ?? 0);
    this.offlineTimeStr = formatSecondsHM(this.offlineSeconds);
    const offlineHours = Math.min(this.offlineSeconds / 3600, 30);
    this.offlineEggs = this.eggsPerHour * offlineHours;
  }
}

function isValue<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}

function formatSecondsHM(seconds: number): string {
  if (seconds === 0) {
    return 'Unknown';
  }
  if (seconds < 0) {
    return formatSecondsHM(-seconds);
  }
  const h = Math.floor(seconds / 3600);
  seconds = seconds - h * 3600;
  const m = Math.floor(seconds / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}
