import { ei, getArtifactFamilyProps, Item, newItem } from 'lib';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

export type Book = Item;
export type Stone = Item;
export type StoneCounts = [number, number, number];

export const books: Book[] = getArtifactFamilyProps(Name.BOOK_OF_BASAN)
  .tiers.map(tier =>
    tier.possible_afx_rarities!.map(rarity => newItem({ name: tier.afx_id, level: tier.afx_level, rarity }))
  )
  .flat();

function getStones(afxId: Name): Stone[] {
  return [Level.INFERIOR, Level.LESSER, Level.NORMAL].map(level =>
    newItem({ name: afxId, level, rarity: Rarity.COMMON })
  );
}

export const prophecyStones = getStones(Name.PROPHECY_STONE);
export const soulStones = getStones(Name.SOUL_STONE);

export const soulFoodLevelCosts = [
  500, 532, 564, 597, 629, 661, 694, 726, 758, 791, 823, 856, 888, 920, 953, 985, 1017, 1050, 1082, 1115, 1147, 1179,
  1212, 1244, 1276, 1309, 1341, 1374, 1406, 1438, 1471, 1503, 1535, 1568, 1600, 1633, 1665, 1697, 1730, 1762, 1794,
  1827, 1859, 1892, 1924, 1956, 1989, 2021, 2053, 2086, 2118, 2151, 2183, 2215, 2248, 2280, 2312, 2345, 2377, 2410,
  2442, 2474, 2507, 2539, 2571, 2604, 2636, 2669, 2701, 2733, 2766, 2798, 2830, 2863, 2895, 2928, 2960, 2992, 3025,
  3057, 3089, 3122, 3154, 3187, 3219, 3251, 3284, 3316, 3348, 3381, 3413, 3446, 3478, 3510, 3543, 3575, 3607, 3640,
  3672, 3705, 3737, 3769, 3802, 3834, 3866, 3899, 3931, 3964, 3996, 4028, 4061, 4093, 4125, 4158, 4190, 4223, 4255,
  4287, 4320, 4352, 4384, 4417, 4449, 4482, 4514, 4546, 4579, 4611, 4643, 4676, 4708, 4741, 4773, 4805, 4838, 4870,
  4902, 4935, 4967, 5000,
] as const;
export const prophecyBonusLevelCosts = [100000, 325000, 550000, 775000, 1000000] as const;

export const maxSoulFoodLevel = soulFoodLevelCosts.length;
export const maxProphecyBonusLevel = prophecyBonusLevelCosts.length;

export function soulFoodUpgradeCost(from: number, to: number): number {
  from = Math.max(from, 0);
  to = Math.min(to, maxSoulFoodLevel);
  return soulFoodLevelCosts.slice(from, to).reduce((sum, cost) => sum + cost, 0);
}

export function prophecyBonusUpgradeCost(from: number, to: number): number {
  from = Math.max(from, 0);
  to = Math.min(to, maxProphecyBonusLevel);
  return prophecyBonusLevelCosts.slice(from, to).reduce((sum, cost) => sum + cost, 0);
}
