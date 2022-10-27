import { ei, decodeMessage } from 'lib';
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
  isCoop: boolean;
  coopCode: string | null;
  hasLeagues: boolean;
  attempted: boolean;
  league: ContractLeague;
  goals: ei.Contract.IGoal[];
  numAvailableGoals: number;
  numCompletedGoals: number;
  numAvailablePEs: number;
  numCompletedPEs: number;
  indexOfPEGoal: number | null;
  timestamp: number; // Either accepted timestamp (attempted) or offering timestamp (unattempted)
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

export function getUserContractList(backup: ei.IBackup): UserContract[] {
  const localContracts: ei.ILocalContract[] = (backup.contracts?.contracts || []).concat(
    backup.contracts?.archive || []
  );
  const attemptedContracts = localContracts
    .map(c => newUserContract(c, true))
    .sort((c1, c2) => c1.timestamp - c2.timestamp);

  const contractIds = new Set(attemptedContracts.map(c => c.id));
  const unattemptedContracts = [];
  // Go through the full contract list reverse chronologically so that we only
  // pick up latest incarnations of unattempted contracts.
  for (const contract of [...rawContractList].reverse()) {
    if (!contractIds.has(contract.identifier!)) {
      unattemptedContracts.push(newUnattemptedUserContract(contract));
      contractIds.add(contract.identifier!);
    }
  }
  unattemptedContracts.sort((c1, c2) => c1.timestamp - c2.timestamp);
  return attemptedContracts.concat(unattemptedContracts);
}

function newUserContract(
  contract: ei.ILocalContract,
  attempted: boolean,
  offeringTimestamp?: number
): UserContract {
  const timestamp = attempted ? contract.timeAccepted! : offeringTimestamp;
  if (!timestamp) {
    throw new Error(`the impossible happened: timestamp not provided`);
  }
  const props: ContractProps = {
    ...contract.contract!,
    offeringTimestamp: offeringTimestamp || contract.timeAccepted!,
  };
  const id = props.identifier!;
  const name = props.name!;
  const egg = props.egg!;
  const isCoop = !!props.maxCoopSize && props.maxCoopSize > 1;
  const coopCode = contract.coopIdentifier || null;
  const league: ContractLeague = contract.league || 0;
  let hasLeagues = false;
  let goals = props.goals;
  if (props.goalSets && props.goalSets.length > league) {
    hasLeagues = true;
    goals = props.goalSets[league].goals;
  }
  if (!goals || goals.length === 0) {
    throw new Error(`no goals found for contract ${id}`);
  }
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
    name,
    egg,
    isCoop,
    coopCode,
    hasLeagues,
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
  };
}

function newUnattemptedUserContract(props: ContractProps): UserContract {
  return newUserContract(
    {
      contract: props,
    },
    false,
    props.offeringTimestamp
  );
}
