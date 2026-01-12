import { ei, getNumTruthEggs } from 'lib';

export function farmEarningBonus(backup: ei.IBackup): number {
  const truthEggs = getNumTruthEggs(backup);
  const truthEggBonus = 1.1;
  return truthEggBonus ** truthEggs - 1;
}
