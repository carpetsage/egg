import { ei, Artifact } from 'lib';

type Effect = {
  delta: number;
};

// Only effects on the enlightenment farm are considered here.
function gatherRelevantEffects(artifacts: Artifact[], afxIds: ei.ArtifactSpec.Name[]): Effect[] {
  const deltas = [];
  for (const artifact of artifacts) {
    if (afxIds.includes(artifact.afxId)) {
      deltas.push({
        delta: artifact.effectDelta,
      });
    }
    for (const stone of artifact.stones) {
      if (afxIds.includes(stone.afxId)) {
        deltas.push({
          delta: stone.effectDelta,
        });
      }
    }
  }
  return deltas;
}

export function aggregateEffect(
  artifacts: Artifact[],
  afxIds: ei.ArtifactSpec.Name[],
  aggregator: (aggregate: number, effect: Effect) => number,
  initialValue: number
): number {
  return gatherRelevantEffects(artifacts, afxIds).reduce(aggregator, initialValue);
}

export function additiveEffect(artifacts: Artifact[], afxIds: ei.ArtifactSpec.Name[]): number {
  return aggregateEffect(artifacts, afxIds, (aggregate, effect) => aggregate + effect.delta, 0);
}

export function multiplicativeEffect(artifacts: Artifact[], afxIds: ei.ArtifactSpec.Name[]): number {
  return aggregateEffect(artifacts, afxIds, (aggregate, effect) => aggregate * (1 + effect.delta), 1);
}
