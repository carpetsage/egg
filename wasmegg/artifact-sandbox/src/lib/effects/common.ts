import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';

import Name = ArtifactSpec.Name;

type Effect = {
  delta: number;
  multiplier: number;
};

function gatherRelevantEffects(build: Build, config: Config, afxIds: Name[]): Effect[] {
  const deltas = [];
  for (const artifact of build.artifacts) {
    if (!artifact.nonEmpty()) {
      continue;
    }

    const effectMultiplier = config.isEnlightenment ? artifact.clarityEffect : 1;
    if (effectMultiplier === 0) {
      continue;
    }

    // Light of eggendil and slotted stones are ineffective on a non-enlightenment farm.
    if (!config.isEnlightenment && artifact.afxId === ArtifactSpec.Name.LIGHT_OF_EGGENDIL) {
      continue;
    }

    if (afxIds.includes(artifact.afxId)) {
      deltas.push({
        delta: artifact.effectDelta,
        multiplier: effectMultiplier,
      });
    }

    for (const stone of artifact.activeStones) {
      if (stone === null) {
        continue;
      }
      if (afxIds.includes(stone.afxId)) {
        deltas.push({
          delta: stone.effectDelta,
          multiplier: effectMultiplier,
        });
      }
    }
  }
  return deltas;
}

export function aggregateEffect(
  build: Build,
  config: Config,
  afxIds: Name[],
  aggregator: (aggregate: number, effect: Effect) => number,
  initialValue: number
): number {
  return gatherRelevantEffects(build, config, afxIds).reduce(aggregator, initialValue);
}

export function additiveEffect(build: Build, config: Config, afxIds: Name[]): number {
  return aggregateEffect(build, config, afxIds, (aggregate, effect) => aggregate + effect.delta * effect.multiplier, 0);
}

export function multiplicativeEffect(build: Build, config: Config, afxIds: Name[]): number {
  return aggregateEffect(
    build,
    config,
    afxIds,
    (aggregate, effect) => aggregate * (1 + effect.delta * effect.multiplier),
    1
  );
}
