import { ei } from './proto';
import { requestContractsInfo, requestContractPlayerInfo } from './api';
import { COLLEGGTIBLE_CONTRACT_MAP } from './colleggtible-contracts';

export enum ContractLeague {
  Elite = 0,
  Standard = 1,
}

export function getContractGoals({
  contract,
  grade = ei.Contract.PlayerGrade.GRADE_C,
  league = ContractLeague.Elite,
}: {
  contract: ei.IContract;
  grade?: ei.Contract.PlayerGrade;
  league?: ContractLeague;
}) {
  if (contract.gradeSpecs) {
    const goals = contract.gradeSpecs.at((grade > 0 ? grade : 1) - 1)?.goals;
    if (goals && goals.length) return goals;
  }
  if (contract.goalSets) {
    const goals = contract.goalSets.at(league)?.goals;
    if (goals && goals.length) return goals;
  }
  if (contract.goals) {
    const goals = contract.goals;
    if (goals && goals.length) return goals;
  }
  throw new Error(`no goals found for contract ${contract.identifier}`);
}

export function contractCompleted(contract: ei.ILocalContract, grade = ei.Contract.PlayerGrade.GRADE_C) {
  if (!contract.contract) {
    return false;
  }
  const goals = getContractGoals({ contract: contract.contract, grade: grade });
  if (contract.numGoalsAchieved === 3) return true;
  if ((contract.numGoalsAchieved ?? 0) >= goals.length) return true;
}

// Unix timestamp after which colleggtibles existed in the game. Contracts
// accepted before this date did not grant colleggtible bonuses, even if a
// later rerun of the same contract identifier used a custom egg.
const COLLEGGTIBLE_CUTOFF_TIME = 1719435600;

/**
 * Fetches the player's ContractPlayerInfo and writes it into the backup as
 * `backup.contracts.lastCpi` (mutating in place), so the rest of the codebase
 * can keep reading `backup.contracts.lastCpi` as if it had been populated by
 * the backup itself.
 *
 * Before the game-API change, the backup payload included `lastCpi`; that
 * field is no longer populated. Callers that want the old behaviour should
 * invoke this helper after `requestFirstContact` and the existing
 * `resolveContractsInBackup`. If the endpoint fails, `backup.contracts.lastCpi`
 * is left untouched so callers see the same null/missing state they would
 * have seen without the helper.
 */
export async function resolveContractPlayerInfo(backup: ei.IBackup, userId?: string): Promise<void> {
  try {
    const cpi = await requestContractPlayerInfo(userId);
    if (!backup.contracts) {
      backup.contracts = {};
    }
    backup.contracts.lastCpi = cpi;
  } catch (e) {
    console.warn('Failed to resolve contract player info:', e);
  }
}

/**
 * Resolves only colleggtible contracts using the locally bundled
 * colleggtible-contracts.json. No API call is made.
 */
export function resolveColleggtibleContracts(backup: ei.IBackup): void {
  const all = [...(backup.contracts?.contracts ?? []), ...(backup.contracts?.archive ?? [])];
  for (const localContract of all) {
    if (
      localContract.contract ||
      !localContract.contractIdentifier ||
      (localContract.timeAccepted ?? 0) <= COLLEGGTIBLE_CUTOFF_TIME
    ) {
      continue;
    }
    const contract = COLLEGGTIBLE_CONTRACT_MAP.get(localContract.contractIdentifier);
    if (contract) {
      localContract.contract = contract;
    }
  }
}

export async function resolveLocalContracts(localContracts: ei.ILocalContract[], userId?: string): Promise<void> {
  const identifiers = [
    ...new Set(
      localContracts
        .filter(c => !c.contract)
        .map(c => c.contractIdentifier)
        .filter((id): id is string => !!id)
    ),
  ];
  if (identifiers.length === 0) {
    return;
  }
  try {
    const response = await requestContractsInfo(identifiers, userId);
    const contractMap = new Map((response.contracts || []).map(c => [c.identifier!, c]));
    for (const localContract of localContracts) {
      if (
        !localContract.contract &&
        localContract.contractIdentifier &&
        contractMap.has(localContract.contractIdentifier)
      ) {
        localContract.contract = contractMap.get(localContract.contractIdentifier)!;
      }
    }
  } catch (e) {
    console.warn('Failed to resolve contract info:', e);
  }
}

export async function resolveContractsInBackup(backup: ei.IBackup, userId?: string): Promise<void> {
  const all = [...(backup.contracts?.contracts || []), ...(backup.contracts?.archive || [])].filter(
    c => !c.contract && c.contractIdentifier
  );
  if (all.length === 0) {
    return;
  }
  await resolveLocalContracts(all, userId);
}
