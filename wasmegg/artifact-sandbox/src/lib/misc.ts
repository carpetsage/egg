import { Artifact, Build, Stone } from './models';

export function stoneSettingCost(artifact: Artifact, stone: Stone): number {
  if (artifact.nonEmpty()) {
    return Math.floor(artifact.baseCraftingPrice * 0.05 + stone.baseCraftingPrice * 0.1);
  } else {
    throw new Error(`attempting to set stone in empty artifact`);
  }
}

export function aggregateStoneSettingCost(build: Build): number {
  let sum = 0;
  for (const artifact of build.artifacts) {
    if (artifact.isEmpty()) {
      continue;
    }
    for (const stone of artifact.activeStones) {
      if (stone === null) {
        continue;
      }
      sum += stoneSettingCost(artifact, stone);
    }
  }
  return sum;
}
