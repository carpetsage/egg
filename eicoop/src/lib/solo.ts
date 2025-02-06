import dayjs, { Dayjs } from 'dayjs';

import { ArtifactSet, ContractLeague, ei, Farm, FarmerRole, getContractGoals } from 'lib';
import { ContractLeagueStatus } from './contract';

export class SoloStatus {
  farm: Farm;

  // Props in common with coop.CoopStatus
  contractId: string;
  contract: ei.IContract;
  backup: ei.IBackup;
  eggsLaid: number;
  eggsPerHour: number;
  secondsRemaining: number;
  projectedEggsLaid: number;
  league: ContractLeague;
  grade: ei.Contract.PlayerGrade;
  goals: ei.Contract.IGoal[];
  refreshTime: Dayjs;
  expirationTime: Dayjs;

  // Props in common with coop.Contributor
  userId: string;
  userName: string;
  earningBonusPercentage: number;
  farmerRole: FarmerRole;
  tokens: number;
  tokensSpent: number;
  hourlyLayingRateUncapped: number;
  projectedHourlyLayingRateUncappedAtFullHabs: number;
  hourlyShippingCapacity: number;
  farmPopulation: number;
  farmCapacity: number;
  internalHatcheryRatePerMinPerHab: number;
  artifacts: ArtifactSet;
  boosts: ei.Backup.IActiveBoost[];

  awayInternalHatcheryRatePerMinPerHab: number;
  internalHatcheryRateBoostMultiplier: number;

  constructor(contract: ei.ILocalContract, backup: ei.IBackup) {
    this.contract = contract.contract!;
    this.contractId = this.contract.identifier!;
    this.backup = backup;
    const farmProps = (() => {
      for (const farm of backup.farms || []) {
        if (farm.contractId === this.contractId) {
          return farm;
        }
      }
      throw new Error(`farm not found for contract ${this.contractId}`);
    })();
    const farm = new Farm(backup, farmProps, {
      tokenIntervalMinutes: this.contract.minutesPerToken || undefined,
    });
    this.farm = farm;
    this.eggsLaid = farm.eggsLaid;
    this.eggsPerHour = farm.eggsPerHour;
    this.refreshTime = farm.refreshTime;
    this.expirationTime = dayjs(contract.timeAccepted! * 1000).add(
      this.contract.lengthSeconds!,
      'seconds'
    );
    this.secondsRemaining = this.expirationTime.diff(dayjs(), 'seconds', true);
    const hoursLeftAtRefresh = Math.max(
      this.expirationTime.diff(this.refreshTime, 'hours', true),
      0
    );
    this.projectedEggsLaid = this.eggsLaid + this.eggsPerHour * hoursLeftAtRefresh;
    this.league = contract.league || 0;
    this.grade = contract.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET;

    this.goals = getContractGoals({ contract: this.contract, grade: this.grade, league: this.league })

    this.userId = backup.eiUserId!;
    this.userName = backup.userName!;
    this.earningBonusPercentage = farm.earningBonusPercentage;
    this.farmerRole = farm.farmerRole;
    this.tokens = farm.tokensInStock;
    this.tokensSpent = farm.tokensSpent;
    this.hourlyLayingRateUncapped = farm.layableEggsPerHour;
    this.projectedHourlyLayingRateUncappedAtFullHabs =
      farm.layableEggsPerChickenPerHour * farm.habSpace;
    this.hourlyShippingCapacity = farm.shippableEggsPerHour;
    this.farmPopulation = farm.numChickens;
    this.farmCapacity = farm.habSpace;
    this.internalHatcheryRatePerMinPerHab = farm.internalHatcheryChickensPerMinutePerHab.active;
    this.artifacts = farm.artifactSet;
    this.boosts = (farm.farm.activeBoosts ?? []).filter(
      boost => !!boost.boostId && (boost.timeRemaining ?? 0) > 0
    );
    this.awayInternalHatcheryRatePerMinPerHab = farm.internalHatcheryChickensPerMinutePerHab.away;
    this.internalHatcheryRateBoostMultiplier = farm.internalHatcheryRateBoostMultiplier;
  }

  get confirmedLeagueStatusNow(): ContractLeagueStatus {
    const secondsRemaining = this.expirationTime.diff(dayjs(), 'seconds', true);
    return new ContractLeagueStatus(this.eggsLaid, this.eggsPerHour, this.eggsLaid, secondsRemaining, this.goals, "");
  }

  get estimatedLeagueStatusNow(): ContractLeagueStatus {
    const now = dayjs();
    const hoursLeftAtRefresh = Math.max(
      this.expirationTime.diff(this.refreshTime, 'hours', true),
      0
    );
    const hoursSinceRefresh = Math.max(now.diff(this.refreshTime, 'hours', true), 0);
    const estimatedEggsLaid =
      this.eggsLaid + Math.min(hoursLeftAtRefresh, hoursSinceRefresh) * this.eggsPerHour;
    const secondsRemaining = this.expirationTime.diff(now, 'seconds', true);
    return new ContractLeagueStatus(
      estimatedEggsLaid,
      this.eggsPerHour,
      estimatedEggsLaid,
      secondsRemaining,
      this.goals,
      ""
    );
  }
}
