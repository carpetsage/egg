import { ei, Artifact } from 'lib';
import { aggregateEffect } from './common';

export function researchPriceMultiplierFromArtifacts(artifacts: Artifact[]): number {
  return aggregateEffect(
    artifacts,
    [ei.ArtifactSpec.Name.PUZZLE_CUBE],
    (aggregate, effect) => (1 + effect.delta) * aggregate,
    1
  );
}
