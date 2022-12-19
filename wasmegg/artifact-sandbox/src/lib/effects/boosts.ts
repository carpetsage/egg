import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { multiplicativeEffect } from './common';

export function boostMultiplier(build: Build, config: Config): number {
  return multiplicativeEffect(build, config, [ArtifactSpec.Name.DILITHIUM_MONOCLE]);
}

export function boostDurationMultiplier(build: Build, config: Config): number {
  return multiplicativeEffect(build, config, [ArtifactSpec.Name.DILITHIUM_STONE]);
}
