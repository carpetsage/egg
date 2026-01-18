import { ei, Artifact } from 'lib';
import { multiplicativeEffect } from './common';

export function farmValueMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [ei.ArtifactSpec.Name.MERCURYS_LENS]);
}
