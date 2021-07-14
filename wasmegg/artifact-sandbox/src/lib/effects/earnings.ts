import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { boostMultiplier } from './boosts';
import { earningBonusMultiplier } from './earning_bonus';
import { layingRateMultiplier } from './laying_rate';
import { maxRunningChickenBonusMultiplier } from './rcb';

export function earningsMultiplier(build: Build, config: Config): number {
  return (
    earningBonusMultiplier(build, config) *
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

export function earningsWithMaxRunningChickenBonusMultiplier(build: Build, config: Config): number {
  return earningsMultiplier(build, config) * maxRunningChickenBonusMultiplier(build, config);
}
