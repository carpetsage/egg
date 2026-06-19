import { ei, decodeMessage } from 'lib';
import contractProtos from './contracts.json';

const localContractMap = new Map<string, ei.IContract>(
  contractProtos.map(c => {
    const contract = decodeMessage(ei.Contract, c.proto) as ei.IContract;
    return [c.id, contract];
  })
);

export function resolveLocalContractsFromBackup(backup: ei.IBackup): void {
  const all = [...(backup.contracts?.contracts || []), ...(backup.contracts?.archive || [])];
  for (const localContract of all) {
    if (localContract.contract || !localContract.contractIdentifier) {
      continue;
    }
    const resolved = localContractMap.get(localContract.contractIdentifier);
    if (resolved) {
      localContract.contract = resolved;
    }
  }
}
