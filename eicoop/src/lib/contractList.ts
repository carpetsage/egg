import { ei, decodeMessage } from 'lib';
import contractProtos from './contracts.json';
import { ContractType } from './contract';

const ORIGINAL_CONTRACT_VALID_DURATION = 21 * 86400;
const LEGGACY_CONTRACT_VALID_DURATION = 7 * 86400;

export const rawContractList = contractProtos.map(
  c => decodeMessage(ei.Contract, c.proto) as ei.IContract
);

export interface Contract extends ei.IContract {
  id: string;
  uniqueKey: string;
  type: ContractType;
  numLeggacies: number;
  offeringTime: number;
  prophecyEggs: number;
  eliteGoal: number;
  standardGoal: number;
}

export class SortedContractList extends Array<Contract> {
  private rawList: ei.IContract[];

  constructor(rawList: ei.IContract[]) {
    rawList ||= []; // Allow constructor to be called with undefined (happens with vuex)
    super(...annotateAndSortContracts(rawList));
    this.rawList = rawList;
  }

  static get [Symbol.species]() {
    return Array;
  }

  add(raw: ei.IContract) {
    this.rawList.push(raw);
    const newSortedList = annotateAndSortContracts(this.rawList);
    this.length = 0;
    this.push(...newSortedList);
  }

  deduplicated() {
    const seen = new Set<string>();
    const deduped: Contract[] = [];
    for (let i = this.length - 1; i >= 0; i--) {
      const contract = this[i];
      if (seen.has(contract.id)) {
        continue;
      }
      deduped.push(contract);
      seen.add(contract.id);
    }
    return deduped.reverse();
  }

  /**
   * Returns the contract with a matching id and expiration timestamp, if any.
   * Expiration timestamps are considered matching if within 30 days of each
   * other.
   * @param contractId
   * @param expirationTime - Epoch seconds.
   * @returns
   */
  get(contractId: string, expirationTime: number): Contract | undefined {
    for (let i = this.length - 1; i >= 0; i--) {
      const contract = this[i];
      if (
        contractId === contract.id &&
        Math.abs(expirationTime - contract.expirationTime!) < 30 * 86400
      ) {
        return contract;
      }
    }
    return undefined;
  }
}

function annotateAndSortContracts(rawList: ei.IContract[]): Contract[] {
  const list: Contract[] = [...rawList]
    .sort((c1, c2) => c1.expirationTime! - c2.expirationTime!)
    .map(c => ({
      ...c,
      id: c.identifier!,
      uniqueKey: `${c.identifier}-${c.expirationTime}`,
      type: 'Original',
      numLeggacies: 0,
      offeringTime: 0,
      prophecyEggs: getProphecyEggsCount(c),
      eliteGoal: getEliteGoal(c),
      standardGoal: getStandardGoal(c),
    }));
  const count = new Map<string, number>();
  for (const contract of list) {
    if (count.has(contract.id)) {
      contract.type = 'Leggacy';
      contract.offeringTime = contract.expirationTime! - LEGGACY_CONTRACT_VALID_DURATION;
      count.set(contract.id, count.get(contract.id)! + 1);
    } else {
      contract.type = 'Original';
      contract.offeringTime = contract.expirationTime! - ORIGINAL_CONTRACT_VALID_DURATION;
      count.set(contract.id, 1);
    }
  }
  for (const contract of list) {
    contract.numLeggacies = count.get(contract.id)! - 1;
  }
  return list.sort((c1, c2) => c1.offeringTime - c2.offeringTime);
}

function getProphecyEggsCount(contract: ei.IContract) {
  let count = 0;
  for (const goal of contract.goals!) {
    if (goal.rewardType === ei.RewardType.EGGS_OF_PROPHECY) {
      count += goal.rewardAmount!;
    }
  }
  return count;
}

function getEliteGoal(contract: ei.IContract) {
  const goals = contract.goals!;
  return goals[goals.length - 1].targetAmount!;
}

function getStandardGoal(contract: ei.IContract) {
  if (!contract.goalSets) {
    return 0;
  }
  const goals = contract.goalSets[1].goals!;
  return goals[goals.length - 1].targetAmount!;
}
