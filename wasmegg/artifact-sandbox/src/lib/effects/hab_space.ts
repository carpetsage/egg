import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';

export function maxHabSpace(build: Build, config: Config): number {
  return Math.floor(baseMaxHabSpace(config) * habSpaceMultiplier(build, config));
}

export function habSpaceMultiplier(build: Build, config: Config): number {
  return multiplicativeEffect(build, config, [ArtifactSpec.Name.ORNATE_GUSSET]);
}

export function baseMaxHabSpace(_config: Config): number {
  // Assume max common research.
  return 1.134e10;
}
