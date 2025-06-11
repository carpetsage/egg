import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';
import { colleggtibleInternalHatcheryRateMultiplier } from './colleggtibles';

export function maxInternalHatcheryRatePerMinPerHab(build: Build, config: Config): number {
  return Math.floor(
    baseMaxInternalHatcheryRatePerMinPerHab(config) * internalHatcheryRateMultiplier(build, config)
  );
}

export function internalHatcheryRateMultiplier(build: Build, config: Config): number {
  return (
    multiplicativeEffect(build, config, [
      ArtifactSpec.Name.THE_CHALICE,
      ArtifactSpec.Name.LIFE_STONE,
    ]) * colleggtibleInternalHatcheryRateMultiplier(config)
  );
}

export function baseMaxInternalHatcheryRatePerMinPerHab(_config: Config): number {
  // Assume max common and epic research.
  return 7440;
}
