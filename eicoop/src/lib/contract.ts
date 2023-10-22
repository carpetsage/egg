import dayjs, { Dayjs } from 'dayjs';
import { ei, requestFirstContact, titleCase } from 'lib';

export type ContractType = 'Original' | 'Leggacy';

export enum ContractLeague {
  Elite = 0,
  Standard = 1,
}
//enum PlayerGrade {
//    GRADE_UNSET = 0,
//    GRADE_C = 1,
//    GRADE_B = 2,
//    GRADE_A = 3,
//    GRADE_AA = 4,
//    GRADE_AAA = 5
//}

export enum ContractCompletionStatus {
  HasCompleted,
  HasNoTimeLeft,
  IsOnTrackToFinish,
  IsNotOnTrackToFinish,
}

export async function getContractFromPlayerSave(
  userId: string,
  contractId: string
): Promise<{ contract: ei.IContract; league: ContractLeague | null, grade: ei.Contract.PlayerGrade | null, creatorName: string } | null> {
  const firstContact = await requestFirstContact(userId);
  if (!firstContact.backup) {
    throw new Error(`No backup found in /ei/bot_first_contact response for ${userId}.`);
  }
  const backup = firstContact.backup!;
  if (!backup.contracts) {
    throw new Error(`No contracts found in ${userId}'s backup.`);
  }
  const localContracts = [
    ...backup.contracts.contracts ?? [],
    ...backup.contracts.archive ?? []
  ];
  for (const contract of localContracts) {
    if (contractId === contract.contract!.identifier) {
      return {
        contract: contract.contract!,
        league: contract.league ?? null,
        grade: contract.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET,
        creatorName: backup.userName ?? '',
      };
    }
  }
  return null;
}

export function getModifiers(gradeSpec: ei.Contract.IGradeSpec) {
  if (!gradeSpec.modifiers) { return [""] }
  return gradeSpec.modifiers.map( modifier => {
    if (modifier.dimension && modifier.value) {
      const name = ei.GameModifier.GameDimension[modifier.dimension]
      return `${titleCase(name)}: ${modifier.value}x`;
    }
    return "";
  });
}

export class ContractLeagueStatus {
  eggsLaid: number;
  eggsPerHour: number;
  secondsRemaining: number;
  completionStatus: ContractCompletionStatus;
  goals: ei.Contract.IGoal[];
  finalTarget: number;
  expectedTimeToComplete: number;
  expectedTimeToCompleteOfflineAdjusted: number;
  // requiredEggsPerHour is null if already failed.
  requiredEggsPerHour: number | null;

  constructor(
    eggsLaid: number,
    eggsPerHour: number,
    eggsLaidOfflineAdjusted: number,
    secondsRemaining: number,
    goals: ei.Contract.IGoal[],
    status: string
  ) {
    this.eggsLaid = eggsLaid;
    this.eggsPerHour = eggsPerHour;
    this.secondsRemaining = secondsRemaining;
    this.goals = goals;
    this.finalTarget = goals[goals.length - 1].targetAmount!;
    if (eggsLaid >= this.finalTarget || status === "COMPLETE") {
      this.completionStatus = ContractCompletionStatus.HasCompleted;
      this.expectedTimeToComplete = 0;
      this.expectedTimeToCompleteOfflineAdjusted = 0;
      this.requiredEggsPerHour = 0;
      return;
    }
    this.expectedTimeToComplete = ((this.finalTarget - eggsLaid) / eggsPerHour) * 3600;
    this.expectedTimeToCompleteOfflineAdjusted = Math.max(((this.finalTarget - eggsLaidOfflineAdjusted) / eggsPerHour) * 3600, 0); 

    if (secondsRemaining <= 0) {
      this.completionStatus = ContractCompletionStatus.HasNoTimeLeft;
      this.requiredEggsPerHour = null;
      return;
    }
    this.requiredEggsPerHour = ((this.finalTarget - eggsLaid) / secondsRemaining) * 3600;
    this.completionStatus =
      eggsPerHour >= this.requiredEggsPerHour
        ? ContractCompletionStatus.IsOnTrackToFinish
        : ContractCompletionStatus.IsNotOnTrackToFinish;
  }

  get hasEnded(): boolean {
    return (
      this.completionStatus === ContractCompletionStatus.HasCompleted ||
      this.completionStatus === ContractCompletionStatus.HasNoTimeLeft
    );
  }

  get expectedFinalCompletionDate(): Dayjs {
    return dayjs().add(this.expectedTimeToComplete, 's');
  }

  get expectedFinalCompletionDateOfflineAdjusted(): Dayjs {
    return dayjs().add(this.expectedTimeToCompleteOfflineAdjusted, 's');
  }

  expectedTimeToCompleteGoal(goal: ei.Contract.IGoal): number {
    const target = goal.targetAmount!;
    if (this.eggsLaid >= target) {
      return 0;
    }
    return ((target - this.eggsLaid) / this.eggsPerHour) * 3600;
  }
}
