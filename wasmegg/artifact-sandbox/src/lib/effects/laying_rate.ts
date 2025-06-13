import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { maxHabSpace, habSpaceMultiplier } from './hab_space';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

export function layingRateMultiplier(build: Build, config: Config): number {
  return (
    multiplicativeEffect(build, config, [ArtifactSpec.Name.QUANTUM_METRONOME, ArtifactSpec.Name.TACHYON_STONE]) *
    colleggtibleModifier(config, ei.GameModifier.GameDimension.EGG_LAYING_RATE) *
    (1 + config.tachyonDeflectorBonus)
  );
}

export function maxLayingRateMultiplier(build: Build, config: Config): number {
  return layingRateMultiplier(build, config) * habSpaceMultiplier(build, config);
}

export function maxHourlyLayingRate(build: Build, config: Config): number {
  return baseMaxHourlyLayingRatePerChicken(config) * layingRateMultiplier(build, config) * maxHabSpace(build, config);
}

function baseMaxHourlyLayingRatePerChicken(_config: Config): number {
  // Base rate: 1 egg per 30 seconds
  // Affected by the following researches:
  // {id, perLevel, maxLevels}
  // {"comfy_nests", 0.10, 50},
  // {"hen_house_ac", 0.05, 50},
  // {"improved_genetics", 0.15, 30},
  // {"time_compress", 0.10, 20},
  // {"timeline_diversion", 0.02, 50},
  // {"relativity_optimization", 0.10, 10},
  // {"epic_egg_laying", 0.05, 20},
  return (
    (1 / 30) *
    (1 + 0.1 * 50) *
    (1 + 0.05 * 50) *
    (1 + 0.15 * 30) *
    (1 + 0.1 * 20) *
    (1 + 0.02 * 50) *
    (1 + 0.1 * 10) *
    (1 + 0.05 * 20) *
    3600
  );
}
