import dayjs, { Dayjs } from 'dayjs';
import { ei, requestFirstContact, UserBackupEmptyError } from 'lib';

export async function getUserBackup(userId: string): Promise<ei.IBackup> {
  const data = await requestFirstContact(userId);
  if (!data.backup || !data.backup.game) {
    throw new UserBackupEmptyError(userId);
  }
  const backup = data.backup;
  if (!backup.settings) {
    throw new Error(`${userId}: no settings info in backup`);
  }
  if (!backup.farms || backup.farms.length === 0) {
    throw new Error(`${userId}: no farm info in backup`);
  }
  return backup;
}

export function getUserBackupTime(backup: ei.IBackup): Dayjs {
  const timestamp = backup.settings?.lastBackupTime;
  if (!timestamp) {
    throw new Error(`${backup.eiUserId}: backup timestamp not found in backup`);
  }
  return dayjs(timestamp * 1000);
}

export function getUserActiveCoopContracts(backup: ei.IBackup): ei.ILocalContract[] {
  return backup.contracts?.contracts?.filter(c => !!c.coopIdentifier) || [];
}

export function getUserActiveSoloContracts(backup: ei.IBackup): ei.ILocalContract[] {
  return backup.contracts?.contracts?.filter(c => !c.coopIdentifier) || [];
}
