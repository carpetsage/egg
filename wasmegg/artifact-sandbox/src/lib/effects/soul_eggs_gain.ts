import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { boostMultiplier } from './boosts';
import { awayEarningsMultiplier, earningsWithMaxRunningChickenBonusMultiplier } from './earnings';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

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
    multiplicativeEffect(build, config, [ArtifactSpec.Name.THE_CHALICE, ArtifactSpec.Name.LIFE_STONE]) *
    (config.tachyonPrismActive ? boostMultiplier(build, config) : 1) *
    colleggtibleModifier(config, ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE)
  );
}

export function soulEggsGainMultiplierAway(build: Build, config: Config): number {
  return Math.pow(virtualEarningsMultiplierAway(build, config), 0.21);
}

export function soulEggsGainWithEmptyHabsStartMultiplierAway(build: Build, config: Config): number {
  return Math.pow(virtualEarningsWithEmptyHabsStartMultiplierAway(build, config), 0.21);
}

function virtualEarningsMultiplierAway(build: Build, config: Config): number {
  return (
    awayEarningsMultiplier(build, config) *
    multiplicativeEffect(build, config, [ArtifactSpec.Name.PHOENIX_FEATHER]) *
    (config.soulBeaconActive ? boostMultiplier(build, config) : 1)
  );
}

function virtualEarningsWithEmptyHabsStartMultiplierAway(build: Build, config: Config): number {
  return (
    virtualEarningsMultiplierAway(build, config) *
    multiplicativeEffect(build, config, [ArtifactSpec.Name.THE_CHALICE, ArtifactSpec.Name.LIFE_STONE]) *
    (config.tachyonPrismActive ? boostMultiplier(build, config) : 1)
  );
}
