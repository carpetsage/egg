import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { boostMultiplier } from './boosts';
import { earningsWithMaxRunningChickenBonusMultiplier } from './earnings';

export function soulEggsGainMultiplier(build: Build, config: Config): number {
  return Math.pow(virtualEarningsMultiplier(build, config), 0.21);
}

export function soulEggsGainWithEmptyHabsStartMultiplier(build: Build, config: Config): number {
  return Math.pow(virtualEarningsWithEmptyHabsStartMultiplier(build, config), 0.21);
}

function virtualEarningsMultiplier(build: Build, config: Config): number {
  return (
    earningsWithMaxRunningChickenBonusMultiplier(build, config) *
    multiplicativeEffect(build, config, [ArtifactSpec.Name.PHOENIX_FEATHER]) *
    (config.soulBeaconActive ? boostMultiplier(build, config) : 1)
  );
}

function virtualEarningsWithEmptyHabsStartMultiplier(build: Build, config: Config): number {
  return (
    virtualEarningsMultiplier(build, config) *
    multiplicativeEffect(build, config, [
      ArtifactSpec.Name.THE_CHALICE,
      ArtifactSpec.Name.LIFE_STONE,
    ]) *
    (config.tachyonPrismActive ? boostMultiplier(build, config) : 1)
  );
}
