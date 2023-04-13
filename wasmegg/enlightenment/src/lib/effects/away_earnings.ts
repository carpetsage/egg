import { ei } from 'lib';
import { Artifact } from '../types';
import { multiplicativeEffect } from './common';

export function awayEarningsMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [
    ei.ArtifactSpec.Name.LUNAR_TOTEM,
    ei.ArtifactSpec.Name.LUNAR_STONE,
  ]);
}
