import dayjs, { Dayjs } from 'dayjs';

import { ArtifactSet, ei, FarmerRole, requestPeriodicals, requestFirstContact, requestQueryCoop, soulPowerToFarmerRole } from 'lib';
import { ContractLeague, getContractFromPlayerSave, ContractLeagueStatus } from './contract';
import { SortedContractList } from './contractList';

// League constants
const COOP_LEAGUE_DIVIDER_EB = 1e13; // 10T%
const COOP_LEAGUE_DEFINITELY_STANDARD_EB = 1e12;
const COOP_LEAGUE_DEFINITELY_ELITE_EB = 1e16;

// Grade Constants
// Min EB for each grade
const GRADES_EB = [0, 1e5, 1e7, 1e9, 1e11, 1e13 ]
// peta3. may need adjustment once update has been out
const COOP_GRADE_PROBABLY_AAA_EB = 1e19;

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

  constructor(cs: ei.IContractCoopStatusResponse) {
    this.contractId = cs.contractIdentifier!;
    this.contract = null;
    this.coopCode = cs.coopIdentifier!;
    this.isPublic = cs.public!;
    this.eggsLaid = cs.totalAmount!;
    this.creatorId = cs.creatorId!;
    this.creatorName = null;
    this.contributors = (cs.contributors || []).map(c => new Contributor(c));
    this.highestEarningBonusPercentage = Math.max(
      ...this.contributors.map(c => c.earningBonusPercentage)
    );
    for (const contributor of this.contributors) {
      contributor.soulMirrorMultiplier =
        (100 + this.highestEarningBonusPercentage) / (100 + contributor.earningBonusPercentage);
    }
    this.eggsPerHour = this.contributors.reduce((sum, c) => sum + c.eggsPerHour, 0);
    this.secondsRemaining = cs.secondsRemaining!;
    this.projectedEggsLaid =
      this.eggsLaid + (this.eggsPerHour * Math.max(this.secondsRemaining, 0)) / 3600;
    this.totalEarningsBoost = this.contributors.reduce((sum, c) => sum + c.earningsBoost, 0);
    this.totalEggLayingRateBoost = this.contributors.reduce(
      (sum, c) => sum + c.eggLayingRateBoost,
      0
    );
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
      this.cannotDetermineCreator =
        !isEncrypted(cs.creatorId) && this.contributors.some(c => isEncrypted(c.id));
    }
    this.grade = null;
    this.league = null;
    this.goals = null;
    this.leagueStatus = null;
    this.refreshTime = dayjs(cs.localTimestamp! * 1000);
    this.expirationTime = this.refreshTime.add(cs.secondsRemaining!, 'second');
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

      // set league if there is no grade config
      this.league = contract.gradeSpecs?.length ? null : await this.resolveLeague(knownLeague);

      // set grade if there is grade config
      this.grade = contract.gradeSpecs?.length ? await this.resolveGrade(knownGrade) : ei.Contract.PlayerGrade.GRADE_UNSET;

    } else {
      if (this.contributors.length === 0) {
        throw new Error(
          `No contributors found in ${this.contractId}:${this.coopCode}, cannot resolve contract info.`
        );
      }
      const userId = this.creatorId;
      const result = await getContractFromPlayerSave(userId, this.contractId);
      if (!result) {
        throw new Error(`Contract ${this.contractId} not found in user's save.`);
      }
      this.contract = result.contract;
      this.league = result.league;
      this.grade = result.grade;
      this.creatorName = result.creatorName;
    }

    if (this.contract.gradeSpecs?.length && this.grade) {
      this.goals = this.contract.gradeSpecs[this.grade as number].goals!;
    }
    else if (this.contract.goalSets) {
      this.goals = this.contract.goalSets[this.league as number].goals!;
    }
    else {
      this.goals = this.contract.goals!;
    }
      
    this.goals = this.contract.goalSets
      ? this.contract.goalSets[this.league as number].goals!
      : this.contract.goals!;
    this.leagueStatus = new ContractLeagueStatus(
      this.eggsLaid,
      this.eggsPerHour,
      this.secondsRemaining,
      this.goals
    );
  }

  async resolveGrade(knownGrade? : ei.Contract.PlayerGrade): Promise<ei.Contract.PlayerGrade> {
    if (knownGrade !== undefined ) {
      this.grade = knownGrade;
      return this.grade;
    }
    if (this.contributors.length === 0 || !this.cannotDetermineCreator || this.expirationTime < dayjs(1682899200)) {
      // Ghost coop, don't care. OR
      // if ids are unencrypted it's definitely older than grades OR
      // contracts before May 01 2023 have no grade
      this.grade = ei.Contract.PlayerGrade.GRADE_UNSET;
      return this.grade;
    }

    // Heuristics.
    let b = 0;
    let a = 0;
    let aa = 0;
    let aaa = 0;
    let aaaa = 0;
    // count up the number of people in each grade eb range and take a guess at contract grade from that
    for (const contributor of this.contributors.reverse()) {
      const eb = contributor.earningBonusPercentage;
      // if any player in the coop has less than b grade cutoff eb it must be a c grade coop
      if (eb < GRADES_EB[ei.Contract.PlayerGrade.GRADE_B]) {
        this.grade = ei.Contract.PlayerGrade.GRADE_C;
        return this.grade;
      }
      else if (eb < GRADES_EB[ei.Contract.PlayerGrade.GRADE_A]) {
        b++;
      }
      else if (eb < GRADES_EB[ei.Contract.PlayerGrade.GRADE_AA]) {
        a++;
      }
      else if (eb < GRADES_EB[ei.Contract.PlayerGrade.GRADE_AAA]) {
        aa++;
      } 
      else {
        aaa++;
        if ( eb > COOP_GRADE_PROBABLY_AAA_EB) { aaaa++; }
      }
    }

    const eb_counts = [0, 0, b, a, aa, aaa];
    const heuristicGrade: ei.Contract.PlayerGrade = eb_counts.indexOf(Math.max(...eb_counts))

    // if we make it this far it *should* be a post-grade contract, be not empty and not c grade
    try {
      // checking periodicals is faster than checking backup but less reliable
      // if the contract is still active and it matches our guess it's hopefully correct
      // Probably? less movement in AAA
      if (this.secondsRemaining > 0 || (aaaa > 0 && heuristicGrade === ei.Contract.PlayerGrade.GRADE_AAA)) {
        const periodicals = await requestPeriodicals(this.creatorId);
        const grade = periodicals.contractPlayerInfo?.grade;
        if(grade === heuristicGrade) {
          this.grade = grade
          return this.grade
        }
      }

      // Query coop creator's backup to try to find coop grade
      const creatorBackup = await requestFirstContact(this.creatorId);
      const contracts = [ ...(creatorBackup.backup?.contracts?.archive ?? []) , ...(creatorBackup.backup?.contracts?.contracts ?? [])]
      const grade = contracts.find(contract => contract.contract?.identifier === this.contractId && contract.coopIdentifier === this.coopCode)?.grade
      // if we already pulled their backup might as well set the creator name
      this.creatorName = creatorBackup.backup?.userName ?? null;
      if (!grade) {
        throw new Error(`Could not determine Contract Grade from player save`)
      }
      this.grade = grade;
      return this.grade;
    } catch (e) {
      console.error(`failed to determine coop grade ${this.contractId}:${this.coopCode}: ${e}`);
      this.grade = heuristicGrade;
      return this.grade;
    }
  }
  
  async resolveLeague(knownLeague?: ContractLeague): Promise<ContractLeague> {

    if (knownLeague !== undefined) {
      this.league =  knownLeague;
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
    const heuristicLeague =
      aboveThresholdCount > belowThresholdCount ? ContractLeague.Elite : ContractLeague.Standard;

    try {
      // Query /ei/query_coop to see if elite league is the wrong league.
      const queryCoopResponse = await requestQueryCoop(this.contractId, this.coopCode, 0);
      this.league = queryCoopResponse.differentLeague
        ? ContractLeague.Standard
        : ContractLeague.Elite;
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

  constructor(contributor: ei.ContractCoopStatusResponse.IContributionInfo) {
    this.id = contributor.userId!;
    this.name = contributor.userName!;
    this.eggsLaid = contributor.contributionAmount!;
    this.eggsPerHour = contributor.contributionRate! * 3600;
    this.earningBonusPercentage = Math.pow(10, contributor.soulPower!) * 100;
    this.farmerRole = soulPowerToFarmerRole(contributor.soulPower!);
    this.tokens = contributor.boostTokens!;
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
          this.projectedHourlyLayingRateUncappedAtFullHabs =
            params.elr * params.farmCapacity * 3600;
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
  }
}

function isValue<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
