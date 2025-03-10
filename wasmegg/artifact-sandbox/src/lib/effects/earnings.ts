import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { boostMultiplier } from './boosts';
import { earningBonusMultiplier } from './earning_bonus';
import { layingRateMultiplier } from './laying_rate';
import { baseMaxRunningChickenBonus, maxRunningChickenBonusMultiplier } from './rcb';

export function earningsMultiplier(build: Build, config: Config): number {
  return (
    earningBonusMultiplier(build, config) *
    earningsMultiplerFromColleggtibles(build, config) *
    multiplicativeEffect(build, config, [
      ArtifactSpec.Name.TUNGSTEN_ANKH,
      ArtifactSpec.Name.DEMETERS_NECKLACE,
      ArtifactSpec.Name.LIGHT_OF_EGGENDIL,
      ArtifactSpec.Name.SHELL_STONE,
    ]) *
    layingRateMultiplier(build, config) *
    (config.birdFeedActive ? boostMultiplier(build, config) : 1)
  );
}

export function earningsMultiplerFromColleggtibles(build: Build, config: Config): number {
  return ( 1 + config.fireworkColleggtible)
}

export function earningsWithMaxRunningChickenBonusMultiplier(build: Build, config: Config): number {
  return earningsMultiplier(build, config) * maxRunningChickenBonusMultiplier(build, config);
}

export function awayEarningsMultiplier(build: Build, config: Config): number {
  return (
    earningsMultiplier(build, config) *
    awayEarningsMultiplerFromColleggtibles(build, config) *
    multiplicativeEffect(build, config, [
      ArtifactSpec.Name.LUNAR_TOTEM,
      ArtifactSpec.Name.LUNAR_STONE,
    ]) * (config.proPermit ? 1 : 0.5) / baseMaxRunningChickenBonus(config)
  );
}
export function awayEarningsMultiplerFromColleggtibles(build: Build, config: Config): number {
  return (config.chocolateColleggtible < 1 ? (1 + config.chocolateColleggtible) : config.chocolateColleggtible)
}

