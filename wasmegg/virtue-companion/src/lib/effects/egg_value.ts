import { ei, Artifact } from 'lib';
import { multiplicativeEffect } from './common';

export function eggValueMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [
    ei.ArtifactSpec.Name.LIGHT_OF_EGGENDIL,
    ei.ArtifactSpec.Name.DEMETERS_NECKLACE,
    ei.ArtifactSpec.Name.TUNGSTEN_ANKH,
    ei.ArtifactSpec.Name.SHELL_STONE,
  ]);
}
