import { ei, decodeMessage, resolveLocalContracts } from 'lib';
import contractProtos from './contracts.json';

const SEASONAL_EGG_TYPES = new Set<number>([
  ei.Egg.CHOCOLATE,
  ei.Egg.EASTER,
  ei.Egg.WATERBALLOON,
  ei.Egg.FIREWORK,
  ei.Egg.PUMPKIN,
]);

const localContractMap = new Map<string, ei.IContract>(
  contractProtos.map(c => {
    const contract = decodeMessage(ei.Contract, c.proto) as ei.IContract;
    return [c.id, contract];
  })
);

const eggsLaidContractIdentifiers = new Set<string>();
for (const contract of localContractMap.values()) {
  if (
    contract.identifier &&
    (contract.customEggId || (contract.egg != null && SEASONAL_EGG_TYPES.has(contract.egg)))
  ) {
    eggsLaidContractIdentifiers.add(contract.identifier);
  }
}

export async function resolveEggsLaidContracts(backup: ei.IBackup, userId?: string): Promise<void> {
  const all = [...(backup.contracts?.contracts || []), ...(backup.contracts?.archive || [])];
  const subset = all.filter(
    c => !c.contract && c.contractIdentifier && eggsLaidContractIdentifiers.has(c.contractIdentifier)
  );
  await resolveLocalContracts(subset, userId);
}
