import { ArtifactSet, defaultModifiers, Farm, Modifiers, Strategy } from 'lib';

export { ArtifactAssemblyStatus, artifactEqual, artifactSetEqual, contenderToArtifactSet } from 'lib';
export type { ArtifactAssemblyStatusNonMissing } from 'lib';

// PrestigeStrategy is an alias for Strategy; import it from recommendation.ts
// which re-exports it under that name.
import { PrestigeStrategy } from './recommendation';

export function artifactSetVirtualEarningsMultiplier(
  farm: Farm,
  set: ArtifactSet,
  strategy: PrestigeStrategy,
  modifiers: Modifiers = defaultModifiers
): number {
  const bareFarm = new Farm(farm.backup, farm.farm);
  bareFarm.artifactSet = new ArtifactSet([], false);
  const equippedFarm = new Farm(farm.backup, farm.farm);
  equippedFarm.artifactSet = set;

  const earningBonusMultiplier = bareFarm.earningBonus > 0 ? equippedFarm.earningBonus / bareFarm.earningBonus : 1;
  const eggValueMultiplier = set.eggValueMultiplier;
  const eggLayingRateMultiplier = set.eggLayingRateMultiplier * modifiers.elr;
  const maxRunningChickenBonusMultiplier =
    equippedFarm.maxRunningChickenBonusWithMaxedCommonResearches /
    bareFarm.maxRunningChickenBonusWithMaxedCommonResearches;
  const virtualEarningsMultiplier = set.virtualEarningsMultiplier;

  let totalMultiplier =
    earningBonusMultiplier *
    eggValueMultiplier *
    eggLayingRateMultiplier *
    maxRunningChickenBonusMultiplier *
    virtualEarningsMultiplier *
    modifiers.earnings;

  switch (strategy) {
    case Strategy.STANDARD_PERMIT_SINGLE_PRELOAD:
    case Strategy.PRO_PERMIT_SINGLE_PRELOAD:
      totalMultiplier *= set.habSpaceMultiplier * modifiers.habCap * set.boostEffectMultiplier ** 2;
      break;
    case Strategy.PRO_PERMIT_MULTI:
      totalMultiplier *= set.internalHatcheryRateMultiplier * modifiers.ihr * set.boostEffectMultiplier ** 3;
      break;
    case Strategy.PRO_PERMIT_LUNAR_PRELOAD_AIO:
      totalMultiplier *=
        (set.habSpaceMultiplier *
          modifiers.habCap *
          set.boostEffectMultiplier ** 2 *
          set.awayEarningsMultiplier *
          modifiers.awayEarnings) /
        equippedFarm.maxRunningChickenBonusWithMaxedCommonResearches;
      break;
  }

  return totalMultiplier;
}
