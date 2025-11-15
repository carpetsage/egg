import { ei, allModifiersFromColleggtibles, fmtApprox, eggName } from '@/lib';
import {
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmShippingCapacity,
  farmInternalHatcheryRates,
  farmInternalHatcheryResearches,
  farmEggLayingRate,
  homeFarmArtifacts,
} from '@/lib';
import dayjs from 'dayjs';

export function projectEggsLaid(backup: ei.IBackup, targetEggAmount: number, active = true, eggOverride?: ei.Egg) {
  const farm = backup.farms![0];
  const egg = eggOverride || farm.eggType!;
  const delivered = backup.virtue?.eggsDelivered!.at(egg - 50) || 0;
  const lastRefreshedPopulation = active ? (farm.numChickens! as number) || 1 : 1;
  const lastRefreshedRelative = active ? Date.now() / 1000 - farm.lastStepTime! : 0;
  const artifacts = homeFarmArtifacts(backup, true);
  const modifiers = allModifiersFromColleggtibles(backup);
  const eggLayingRate = 60 * farmEggLayingRate(farm, backup.game!, artifacts) * modifiers.elr;
  const perChickenPerMinuteLayingRate = eggLayingRate / (farm.numChickens! || 1);
  const shippingCapacity = 60 * farmShippingCapacity(farm, backup.game!, artifacts, modifiers.shippingCap);
  const effectivePopulationCap = shippingCapacity / perChickenPerMinuteLayingRate;
  const totalTruthEggs = backup.virtue?.eovEarned?.reduce((a, b) => a + b, 0) || 0;

  const { offlineRate: offlineIHR } = farmInternalHatcheryRates(
    farmInternalHatcheryResearches(farm, backup.game!),
    artifacts,
    modifiers.ihr,
    totalTruthEggs
  );
  const habs = farmHabs(farm);
  const habSpaceResearches = farmHabSpaceResearches(farm);
  const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, modifiers.habCap);
  const habCapacity = Math.round(habSpaces.reduce((total, s) => total + s));

  const maxPopulation = Math.min(habCapacity, effectivePopulationCap);
  const startingEggLayingRate = active ? Math.min(eggLayingRate, shippingCapacity) : perChickenPerMinuteLayingRate;
  const targetEggsRemaining = targetEggAmount - delivered;

  // No population growth possible - either no IHR or already at max capacity
  if (offlineIHR === 0 || lastRefreshedPopulation >= maxPopulation) {
    return (60 * targetEggsRemaining) / startingEggLayingRate - lastRefreshedRelative;
  }
  let timeToTarget =
    (Math.sqrt(
      lastRefreshedPopulation ** 2 +
        (2 * offlineIHR * lastRefreshedPopulation * targetEggsRemaining) / startingEggLayingRate
    ) -
      lastRefreshedPopulation) /
    offlineIHR;
  if (timeToTarget > (maxPopulation - lastRefreshedPopulation) / offlineIHR) {
    timeToTarget =
      ((lastRefreshedPopulation * targetEggsRemaining) / startingEggLayingRate +
        ((maxPopulation - lastRefreshedPopulation) * (maxPopulation - lastRefreshedPopulation)) / (2 * offlineIHR)) /
      maxPopulation;
  }
  return 60 * timeToTarget - lastRefreshedRelative;
}

export function projectEggsLaidOverTime(backup: ei.IBackup, timeInSeconds: number, ihr?: number) {
  const farm = backup.farms![0];
  const lastRefreshedPopulation = (farm.numChickens! as number) || 1;
  const lastRefreshedRelative = Date.now() / 1000 - farm.lastStepTime!;
  const artifacts = homeFarmArtifacts(backup, true);
  const modifiers = allModifiersFromColleggtibles(backup);
  const eggLayingRate = 60 * farmEggLayingRate(farm, backup.game!, artifacts) * modifiers.elr;
  const perChickenPerMinuteLayingRate = eggLayingRate / lastRefreshedPopulation;
  const shippingCapacity = 60 * farmShippingCapacity(farm, backup.game!, artifacts, modifiers.shippingCap);
  const effectivePopulationCap = shippingCapacity / perChickenPerMinuteLayingRate;
  const totalTruthEggs = backup.virtue?.eovEarned?.reduce((a, b) => a + b, 0) || 0;

  const { offlineRate: offlineIHR } = ihr
    ? { offlineRate: ihr }
    : farmInternalHatcheryRates(
        farmInternalHatcheryResearches(farm, backup.game!),
        artifacts,
        modifiers.ihr,
        totalTruthEggs
      );
  const habs = farmHabs(farm);
  const habSpaceResearches = farmHabSpaceResearches(farm);
  const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, modifiers.habCap);
  const habCapacity = Math.round(habSpaces.reduce((total, s) => total + s));

  const maxPopulation = Math.min(habCapacity, effectivePopulationCap);
  const startingEggLayingRate = Math.min(eggLayingRate, shippingCapacity);
  const timeInMinutes = (timeInSeconds + lastRefreshedRelative) / 60;

  // No population growth possible - either no IHR or already at max capacity
  if (offlineIHR === 0 || lastRefreshedPopulation >= maxPopulation) {
    return startingEggLayingRate * timeInMinutes;
  }

  const timeToMaxPopulation = (maxPopulation - lastRefreshedPopulation) / offlineIHR;

  if (timeInMinutes <= timeToMaxPopulation) {
    // Population is still growing during the entire time period
    return (
      (startingEggLayingRate * timeInMinutes * lastRefreshedPopulation +
        (startingEggLayingRate * offlineIHR * timeInMinutes * timeInMinutes) / 2) /
      lastRefreshedPopulation
    );
  } else {
    // Population reaches max, then stays constant
    const eggsFromGrowthPhase =
      (startingEggLayingRate * timeToMaxPopulation * lastRefreshedPopulation +
        (startingEggLayingRate * offlineIHR * timeToMaxPopulation * timeToMaxPopulation) / 2) /
      lastRefreshedPopulation;
    const eggsFromMaxPhase = startingEggLayingRate * (timeInMinutes - timeToMaxPopulation);
    return eggsFromGrowthPhase + eggsFromMaxPhase;
  }
}
