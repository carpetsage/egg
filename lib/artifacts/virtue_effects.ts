import { ei } from '../proto';
import { Item, Stone } from './effects';

type Effect = {
  delta: number;
};

interface ArtifactWithStones {
  afxId: ei.ArtifactSpec.Name;
  effectDelta: number;
  stones: Stone[];
}

// Only effects on the enlightenment farm are considered here.
function gatherRelevantEffects(artifacts: ArtifactWithStones[], afxIds: ei.ArtifactSpec.Name[]): Effect[] {
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

function aggregateEffect(
  artifacts: ArtifactWithStones[],
  afxIds: ei.ArtifactSpec.Name[],
  aggregator: (aggregate: number, effect: Effect) => number,
  initialValue: number
): number {
  return gatherRelevantEffects(artifacts, afxIds).reduce(aggregator, initialValue);
}

function multiplicativeEffect(artifacts: ArtifactWithStones[], afxIds: ei.ArtifactSpec.Name[]): number {
  return aggregateEffect(artifacts, afxIds, (aggregate, effect) => aggregate * (1 + effect.delta), 1);
}

/**
 * Calculate the egg value multiplier from artifacts.
 * Considers Demeter's Necklace, Tungsten Ankh, and Shell Stones.
 */
export function eggValueMultiplier(artifacts: ArtifactWithStones[]): number {
  return multiplicativeEffect(artifacts, [
    ei.ArtifactSpec.Name.DEMETERS_NECKLACE,
    ei.ArtifactSpec.Name.TUNGSTEN_ANKH,
    ei.ArtifactSpec.Name.SHELL_STONE,
  ]);
}

/**
 * Calculate the away earnings multiplier from artifacts.
 * Considers Lunar Totem and Lunar Stones.
 */
export function awayEarningsMultiplier(artifacts: ArtifactWithStones[]): number {
  return multiplicativeEffect(artifacts, [
    ei.ArtifactSpec.Name.LUNAR_TOTEM,
    ei.ArtifactSpec.Name.LUNAR_STONE,
  ]);
}

/**
 * Calculate the research price multiplier from artifacts.
 * Considers Puzzle Cube. Lower is better (discount).
 */
export function researchPriceMultiplierFromArtifacts(artifacts: ArtifactWithStones[]): number {
  return aggregateEffect(
    artifacts,
    [ei.ArtifactSpec.Name.PUZZLE_CUBE],
    (aggregate, effect) => (1 + effect.delta) * aggregate,
    1
  );
}
