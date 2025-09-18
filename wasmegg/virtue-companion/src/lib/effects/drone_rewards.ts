import { ei } from 'lib';
import { Artifact } from '../types';
import { multiplicativeEffect } from './common';

export function droneRewardsMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [ei.ArtifactSpec.Name.AURELIAN_BROOCH]);
}
