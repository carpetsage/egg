import { ei, decodeMessage, contractSeasons } from 'lib';
import contractProtos from './contracts.json';

export enum ContractLeague {
  Elite = 0,
  Standard = 1,
}

export interface ContractProps extends ei.IContract {
  offeringTimestamp: number;
}

export interface UserContract {
  id: string;
  name: string;
  egg: ei.Egg;
  customEggId?: string | null;
  isCoop: boolean;
  coopCode: string | null;
  hasGrades: boolean;
  score: number;
  teamworkScore: number;
  duration: number;
  hasLeagues: boolean;
  attempted: boolean;
  league: ContractLeague;
  grade: ei.Contract.PlayerGrade;
  goals: ei.Contract.IGoal[];
  numAvailableGoals: number;
  numCompletedGoals: number;
  numAvailablePEs: number;
  numCompletedPEs: number;
  indexOfPEGoal: number | null;
  timestamp: number; // Either accepted timestamp (attempted) or offering timestamp (unattempted)
  tokens: number;
  season: string;
  props: ContractProps;
}

const ORIGINAL_CONTRACT_VALID_DURATION = 21 * 86400;
const LEGGACY_CONTRACT_VALID_DURATION = 7 * 86400;

export const rawContractList: ContractProps[] = (() => {
  const list: ContractProps[] = contractProtos
    .map(c => decodeMessage(ei.Contract, c.proto) as ei.IContract)
    .sort((c1, c2) => c1.expirationTime! - c2.expirationTime!)
    .map(c => ({
      ...c,
      offeringTimestamp: 0,
    }));
  const count = new Map<string, number>();
  for (const contract of list) {
    if (count.has(contract.identifier!)) {
      // Leggacy
      contract.offeringTimestamp = contract.expirationTime! - LEGGACY_CONTRACT_VALID_DURATION;
      count.set(contract.identifier!, count.get(contract.identifier!)! + 1);
    } else {
      // Original
      contract.offeringTimestamp = contract.expirationTime! - ORIGINAL_CONTRACT_VALID_DURATION;
      count.set(contract.identifier!, 1);
    }
  }
  return list.sort((c1, c2) => c1.offeringTimestamp - c2.offeringTimestamp);
})();

export function getUserContractList(backup: ei.IBackup, archive?: ei.IContractsArchive): UserContract[] {
  const activeContracts: ei.ILocalContract[] = backup.contracts?.contracts || [];
  const pastContracts: ei.ILocalContract[] = archive?.archive || backup.contracts?.archive || [];
  const localContracts: ei.ILocalContract[] = [];

  // compare past contracts with active contracts. Only a contract from one source
  for (const past of pastContracts) {
    const match = activeContracts.find(c => c.contract?.identifier === past.contract?.identifier);
    if (!match) {
      localContracts.push(past);
    } else {
      localContracts.push(match);
    }
  }
  // Add any active contracts that don't match past contracts
  for (const active of activeContracts) {
    const match = localContracts.find(c => c.contract?.identifier === active.contract?.identifier);
    if (!match) {
      localContracts.push(active);
    }
  }

  const attemptedContracts = localContracts
    .map(c => newUserContract(c, true, undefined, c.grade))
    .sort((c1, c2) => c1.timestamp - c2.timestamp);

  const contractIds = new Set(attemptedContracts.map(c => c.id));
  const unattemptedContracts = [];
  // Go through the full contract list reverse chronologically so that we only
  // pick up latest incarnations of unattempted contracts.
  for (const contract of [...rawContractList].reverse()) {
    if (!contractIds.has(contract.identifier!)) {
      unattemptedContracts.push(newUnattemptedUserContract(contract, backup.contracts?.lastCpi?.grade));
      contractIds.add(contract.identifier!);
    }
  }
  unattemptedContracts.sort((c1, c2) => c1.timestamp - c2.timestamp);
  return attemptedContracts.concat(unattemptedContracts);
}

function newUserContract(
  contract: ei.ILocalContract,
  attempted: boolean,
  offeringTimestamp?: number,
  playerGrade?: ei.Contract.PlayerGrade | null
): UserContract {
  const timestamp = attempted ? contract.timeAccepted || contract.contract?.startTime : offeringTimestamp;
  if (!timestamp) {
    throw new Error(`the impossible happened: timestamp not provided: ${contract.contract?.identifier}`);
  }
  const props: ContractProps = {
    ...contract.contract!,
    offeringTimestamp: offeringTimestamp || contract.timeAccepted!,
  };
  const id = props.identifier!;
  const name = props.name!;
  const season = contractSeasons.get(props.seasonId ?? '')?.name || '';
  const egg = props.egg!;
  const customEggId = props.customEggId;
  const isCoop = !!props.maxCoopSize && props.maxCoopSize > 1;
  const coopCode = contract.coopIdentifier || null;
  const league: ContractLeague = contract.league || 0;
  let hasLeagues = false;
  // grade stuff
  const hasGrades = Boolean(contract.contract?.gradeSpecs);
  const grade = hasGrades
    ? contract.evaluation?.grade || playerGrade || ei.Contract.PlayerGrade.GRADE_AAA
    : ei.Contract.PlayerGrade.GRADE_UNSET;
  let goals = props.gradeSpecs?.[(grade || 1) - 1].goals ?? props.goals;
  if (!hasGrades && props.goalSets && props.goalSets.length > league) {
    hasLeagues = true;
    goals = props.goalSets[league].goals;
  }
  if (!goals || goals.length === 0) {
    throw new Error(`no goals found for contract ${id}`);
  }
  const score = contract.evaluation?.cxp ?? 0;
  const teamworkScore = contract.evaluation?.teamworkScore ?? 0;
  const duration = contract.evaluation?.completionTime ?? 0;
  const tokens = contract.evaluation?.giftTokensReceived || 0;
  const numAvailableGoals = goals.length;
  const numCompletedGoals = contract.numGoalsAchieved || 0;
  let numAvailablePEs = 0;
  let numCompletedPEs = 0;
  let indexOfPEGoal: number | null = null;
  for (let i = 0; i < numAvailableGoals; i++) {
    const goal = goals[i];
    if (goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY) {
      indexOfPEGoal = i;
      const count = Math.round(goal.rewardAmount!);
      numAvailablePEs += count;
      if (i < numCompletedGoals) {
        numCompletedPEs += count;
      }
    }
  }
  return {
    id,
    tokens,
    name,
    season,
    teamworkScore,
    egg,
    customEggId,
    isCoop,
    coopCode,
    hasLeagues,
    hasGrades,
    score,
    duration,
    attempted,
    league,
    goals,
    numAvailableGoals,
    numCompletedGoals,
    numAvailablePEs,
    numCompletedPEs,
    indexOfPEGoal,
    timestamp,
    props,
    grade,
  };
}

function newUnattemptedUserContract(props: ContractProps, grade?: ei.Contract.PlayerGrade | null): UserContract {
  return newUserContract(
    {
      contract: props,
    },
    false,
    props.offeringTimestamp,
    grade
  );
}
