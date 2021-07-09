import { Artifact, ArtifactSet, Farm, Item } from 'lib';

import { Contender, PrestigeStrategy } from './recommendation';
import { ImpossibleError, newArray } from './utils';

export function artifactEqual(a1: Artifact, a2: Artifact): boolean {
  if (a1.key !== a2.key) {
    return false;
  }
  if (a1.stones.length !== a2.stones.length) {
    return false;
  }
  for (let i = 0; i < a1.stones.length; i++) {
    if (a1.stones[i].key !== a2.stones[i].key) {
      return false;
    }
  }
  return true;
}

export function artifactSetEqual(s1: ArtifactSet, s2: ArtifactSet): boolean {
  if (s1.artifacts.length !== s2.artifacts.length) {
    return false;
  }
  for (let i = 0; i < s1.artifacts.length; i++) {
    if (!artifactEqual(s1.artifacts[i], s2.artifacts[i])) {
      return false;
    }
  }
  return true;
}

export function contenderToArtifactSet(contender: Contender, guide: ArtifactSet): ArtifactSet {
  const unstonedArtifacts = contender.artifacts;
  const stones = contender.stones;
  const constructedArtifacts = newArray<Artifact | null>(
    Math.max(unstonedArtifacts.length, guide.artifacts.length),
    () => null
  );
  for (let i = 0; i < guide.artifacts.length; i++) {
    const guideArtifact = guide.artifacts[i];
    const host = extractItem(unstonedArtifacts, guideArtifact.host);
    if (host !== null) {
      const stonesToSlot = [];
      for (const stoneGuide of guideArtifact.stones) {
        const stone = extractItem(stones, stoneGuide);
        if (stone !== null) {
          stonesToSlot.push(stone);
        }
      }
      constructedArtifacts[i] = new Artifact(host, stonesToSlot);
    }
  }
  for (let i = 0; i < constructedArtifacts.length; i++) {
    const currentOccupant = constructedArtifacts[i];
    if (currentOccupant === null) {
      if (unstonedArtifacts.length > 0) {
        const host = unstonedArtifacts.shift()!;
        const stonesToSlot = <Item[]>[];
        while (stonesToSlot.length < host.slots && stones.length > 0) {
          stonesToSlot.push(stones.shift()!);
        }
        constructedArtifacts[i] = new Artifact(host, stonesToSlot);
      }
    } else if (currentOccupant.stones.length < currentOccupant.slots) {
      while (currentOccupant.stones.length < currentOccupant.slots && stones.length > 0) {
        currentOccupant.stones.push(stones.shift()!);
      }
    }
    if (unstonedArtifacts.length === 0 && stones.length === 0) {
      break;
    }
  }
  if (unstonedArtifacts.length > 0 || stones.length > 0) {
    throw new ImpossibleError(
      `${unstonedArtifacts.length} artifacts and ${stones.length} stones left`
    );
  }
  return new ArtifactSet(constructedArtifacts.filter(notNull), false);
}

// Extract an item from items if it exists (items is updated in place) and
// returns it. Returns null if it doesn't exist.
function extractItem(items: Item[], wantedItem: Item): Item | null {
  const wantedKey = wantedItem.key;
  for (let i = 0; i < items.length; i++) {
    if (items[i].key === wantedKey) {
      const extracted = items[i];
      items.splice(i, 1);
      return extracted;
    }
  }
  return null;
}

function notNull<T>(x: T | null): x is T {
  return x !== null;
}

export function artifactSetVirtualEarningsMultiplier(
  farm: Farm,
  set: ArtifactSet,
  strategy: PrestigeStrategy
): number {
  const bareFarm = new Farm(farm.backup, farm.farm);
  bareFarm.artifactSet = new ArtifactSet([], false);
  const equippedFarm = new Farm(farm.backup, farm.farm);
  equippedFarm.artifactSet = set;

  const earningBonusMultiplier =
    bareFarm.earningBonus > 0 ? equippedFarm.earningBonus / bareFarm.earningBonus : 1;
  const eggValueMultiplier = set.eggValueMultiplier;
  const eggLayingRateMultiplier = set.eggLayingRateMultiplier;
  const maxRunningChickenBonusMultiplier =
    equippedFarm.maxRunningChickenBonusWithMaxedCommonResearches /
    bareFarm.maxRunningChickenBonusWithMaxedCommonResearches;
  const virtualEarningsMultiplier = set.virtualEarningsMultiplier;

  let totalMultiplier =
    earningBonusMultiplier *
    eggValueMultiplier *
    eggLayingRateMultiplier *
    maxRunningChickenBonusMultiplier *
    virtualEarningsMultiplier;

  switch (strategy) {
    case PrestigeStrategy.STANDARD_PERMIT_SINGLE_PRELOAD:
    case PrestigeStrategy.PRO_PERMIT_SINGLE_PRELOAD:
      totalMultiplier *= set.habSpaceMultiplier * set.boostEffectMultiplier ** 2;
      break;
    case PrestigeStrategy.PRO_PERMIT_MULTI:
      totalMultiplier *= set.internalHatcheryRateMultiplier * set.boostEffectMultiplier ** 3;
      break;
  }

  return totalMultiplier;
}
