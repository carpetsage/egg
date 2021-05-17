import { ei } from 'lib';
import { requestFirstContact } from './api';

export type ContractType = 'Original' | 'Leggacy';

export enum ContractLeague {
  Elite = 0,
  Standard = 1,
}

export enum ContractCompletionStatus {
  HasCompleted,
  HasNoTimeLeft,
  IsOnTrackToFinish,
  IsNotOnTrackToFinish,
}

export async function getContractFromPlayerSave(
  userId: string,
  contractId: string
): Promise<{ contract: ei.IContract; league: ContractLeague } | null> {
  const firstContact = await requestFirstContact(userId);
  if (!firstContact.backup) {
    throw new Error(`No backup found in /ei/first_contact response for ${userId}.`);
  }
  const backup = firstContact.backup!;
  if (!backup.contracts) {
    throw new Error(`No contracts found in ${userId}'s backup.`);
  }
  const localContracts = ([] as ei.ILocalContract[]).concat(
    backup.contracts!.contracts || [],
    backup.contracts!.archive || []
  );
  for (const contract of localContracts) {
    if (contractId === contract.contract!.identifier) {
      return {
        contract: contract.contract!,
        league: contract.league! as ContractLeague,
      };
    }
  }
  return null;
}
