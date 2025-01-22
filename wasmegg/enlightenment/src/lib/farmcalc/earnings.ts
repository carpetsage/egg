import { ei } from 'lib';
import { awayEarningsMultiplier } from '../effects';
import { Artifact, Colleggtible } from '../types';
import { farmEarningBonus } from './earning_bonus';
import { farmEggValue, farmEggValueResearches } from './egg_value';
import { farmEggLayingRate } from './laying_rate';
import { farmMaxRCB, farmMaxRCBResearches } from './max_rcb';
import { farmShippingCapacity } from './shipping_capacity';
import { awayEarningsFromColleggtibles, earningsFromColleggtibles} from './colleggtible_eggs';

export function farmEarningRate(
  backup: ei.IBackup,
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame,
  artifacts: Artifact[],
  colleggtibles: Colleggtible,
): {
  onlineBaseline: number;
  onlineMaxRCB: number;
  offline: number;
} {
  const eggValue = farmEggValue(farmEggValueResearches(farm), artifacts);
  const eggLayingRate = farmEggLayingRate(farm, progress, artifacts, colleggtibles);
  const shippingCapacity = farmShippingCapacity(farm, progress, artifacts, colleggtibles);
  const earningBonus = farmEarningBonus(backup, farm, progress, artifacts);
  const onlineBaseline = eggValue * Math.min(eggLayingRate, shippingCapacity) * earningBonus * earningsFromColleggtibles(colleggtibles);
  const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);
  const onlineMaxRCB = onlineBaseline * maxRCB;
  // Standard permit earnings halved while offline.
  const offline =
    onlineBaseline * (progress.permitLevel === 1 ? 1 : 0.5) * awayEarningsMultiplier(artifacts) * awayEarningsFromColleggtibles(colleggtibles);
  return {
    onlineBaseline, 
    onlineMaxRCB,
    offline,
  };
}
