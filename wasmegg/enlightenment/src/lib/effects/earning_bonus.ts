import { ei } from 'lib';
import { Artifact } from '../types';
import { additiveEffect } from './common';

export function soulEggBonusFromArtifacts(artifacts: Artifact[]): number {
  return additiveEffect(artifacts, [ei.ArtifactSpec.Name.SOUL_STONE]);
}

export function prophecyEggBonusFromArtifacts(artifacts: Artifact[]): number {
  return additiveEffect(artifacts, [
    ei.ArtifactSpec.Name.BOOK_OF_BASAN,
    ei.ArtifactSpec.Name.PROPHECY_STONE,
  ]);
}
