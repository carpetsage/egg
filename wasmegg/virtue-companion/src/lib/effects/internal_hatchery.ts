import { ei } from 'lib';
import { Artifact } from '../types';
import { multiplicativeEffect } from './common';

export function internalHatcheryRateMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [ei.ArtifactSpec.Name.THE_CHALICE, ei.ArtifactSpec.Name.LIFE_STONE]);
}
