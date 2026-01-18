import { ei, Artifact } from 'lib';
import { additiveEffect } from './common';

export function maxRCBBonusFromArtifacts(artifacts: Artifact[]): number {
  return additiveEffect(artifacts, [ei.ArtifactSpec.Name.VIAL_MARTIAN_DUST, ei.ArtifactSpec.Name.TERRA_STONE]);
}
