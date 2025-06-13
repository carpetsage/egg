import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { boostMultiplier } from './boosts';
import { earningBonusMultiplier } from './earning_bonus';
import { layingRateMultiplier } from './laying_rate';
import { maxRunningChickenBonusMultiplier } from './rcb';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

export function earningsMultiplier(build: Build, config: Config): number {
  const earningBonus = earningBonusMultiplier(build, config);
  const artifactEffect = multiplicativeEffect(build, config, [
    ArtifactSpec.Name.TUNGSTEN_ANKH,
    ArtifactSpec.Name.DEMETERS_NECKLACE,
    ArtifactSpec.Name.LIGHT_OF_EGGENDIL,
    ArtifactSpec.Name.SHELL_STONE,
  ]);
  const layingRate = layingRateMultiplier(build, config);
  const colleggtible = colleggtibleModifier(config, ei.GameModifier.GameDimension.EARNINGS);
  const boost = config.birdFeedActive ? boostMultiplier(build, config) : 1;

  return earningBonus * artifactEffect * layingRate * colleggtible * boost;
}

export function earningsWithMaxRunningChickenBonusMultiplier(build: Build, config: Config): number {
  return earningsMultiplier(build, config) * maxRunningChickenBonusMultiplier(build, config);
}

export function awayEarningsMultiplier(build: Build, config: Config): number {
  return (
    earningsMultiplier(build, config) *
    multiplicativeEffect(build, config, [ArtifactSpec.Name.LUNAR_TOTEM, ArtifactSpec.Name.LUNAR_STONE]) *
    colleggtibleModifier(config, ei.GameModifier.GameDimension.AWAY_EARNINGS) *
    (config.proPermit ? 1 : 0.5)
  );
}
