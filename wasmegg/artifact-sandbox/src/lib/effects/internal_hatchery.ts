import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';

export function maxInternalHatcheryRatePerMinPerHab(build: Build, config: Config): number {
  return Math.floor(
    baseMaxInternalHatcheryRatePerMinPerHab(config) * internalHatcheryRateMultiplier(build, config)
  );
}

export function internalHatcheryRateMultiplier(build: Build, config: Config): number {
  return multiplicativeEffect(build, config, [
    ArtifactSpec.Name.THE_CHALICE,
    ArtifactSpec.Name.LIFE_STONE,
  ]);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function baseMaxInternalHatcheryRatePerMinPerHab(config: Config): number {
  // Assume max common and epic research.
  return 7440;
}
/* eslint-enable @typescript-eslint/no-unused-vars */
