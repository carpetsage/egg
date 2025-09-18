import { ei } from 'lib';
import { Artifact } from '../types';
import { multiplicativeEffect } from './common';

export function shippingCapacityMultiplier(artifacts: Artifact[]): number {
  return multiplicativeEffect(artifacts, [
    ei.ArtifactSpec.Name.INTERSTELLAR_COMPASS,
    ei.ArtifactSpec.Name.QUANTUM_STONE,
  ]);
}
