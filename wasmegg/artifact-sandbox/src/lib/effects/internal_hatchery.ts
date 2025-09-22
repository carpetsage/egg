import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

export function maxInternalHatcheryRatePerMinPerHab(build: Build, config: Config): number {
  return Math.floor(baseMaxInternalHatcheryRatePerMinPerHab(config) * internalHatcheryRateMultiplier(build, config));
}

export function internalHatcheryRateMultiplier(build: Build, config: Config): number {
  return (
    multiplicativeEffect(build, config, [ArtifactSpec.Name.THE_CHALICE, ArtifactSpec.Name.LIFE_STONE]) *
    colleggtibleModifier(config, ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE) *
    (config.isVirtue ? 1.1 : 1.01) ** config.truthEggs
  );
}

export function baseMaxInternalHatcheryRatePerMinPerHab(_config: Config): number {
  // Assume max common and epic research.
  return 7440;
}
