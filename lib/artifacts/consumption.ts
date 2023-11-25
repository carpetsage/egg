import data from './consumption.json';
import { Inventory } from './inventory';

import { ei } from '../proto';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

const itemKey = (afxId: Name, afxLevel: Level, afxRarity: Rarity) =>
  (afxId << 16) + (afxLevel << 8) + afxRarity;

const itemKeyToExpectedFullConsumptionGold = new Map<number, number>(
  data.map(entry => [
    itemKey(entry.item.afx_id, entry.item.afx_level, entry.item.afx_rarity),
    entry.full_consumption.filter(f => f.reward_type == 2)[0]?.reward_amount ?? 0,
  ])
);

const itemKeyToExpectedFullConsumptionPiggyFill = new Map<number, number>(
  data.map(entry => [
    itemKey(entry.item.afx_id, entry.item.afx_level, entry.item.afx_rarity),
    entry.full_consumption.filter(f => f.reward_type == 6)[0]?.reward_amount ?? 0,
  ])
);

const itemKeyToDemotionGold = new Map<number, number | null>(
  data.map(entry => [
    itemKey(entry.item.afx_id, entry.item.afx_level, entry.item.afx_rarity),
    entry.demotion_gold,
  ])
);

function GetFullConsumptionRewards(
  afxId: Name,
  afxLevel: Level,
  afxRarity: Rarity
): [goldenEggs: number, piggyFill: number] {
  const key = itemKey(afxId, afxLevel, afxRarity);
  const gold = itemKeyToExpectedFullConsumptionGold.get(key);
  if (gold === undefined) {
    throw new Error(
      `expected full consumption gold not available for ${afxId}:${afxLevel}:${afxRarity}`
    );
  }
  const piggyFill = itemKeyToExpectedFullConsumptionPiggyFill.get(key);
  if (piggyFill === undefined) {
    throw new Error(
      `expected full consumption piggyFill not available for ${afxId}:${afxLevel}:${afxRarity}`
    );
  }
  return [gold, piggyFill];
}

export function itemExpectedFullConsumption(
  afxId: Name,
  afxLevel: Level,
  afxRarity: Rarity
): [number, number] {
  // Consumption data not available for uncommon item, use demotion gold +
  // consumption gold of common counterpart.
  if (afxRarity == Rarity.COMMON) return GetFullConsumptionRewards(afxId, afxLevel, afxRarity);

  const key = itemKey(afxId, afxLevel, afxRarity);
  const demotionGold = itemKeyToDemotionGold.get(key);
  if (demotionGold === undefined || demotionGold === null) {
    throw new Error(`demotion gold not available for ${afxId}:${afxLevel}:${afxRarity}`);
  }
  const commonRewards = GetFullConsumptionRewards(afxId, afxLevel, Rarity.COMMON);
  return [(commonRewards[0] += demotionGold), commonRewards[1]];
}

export function inventoryExpectedFullConsumption(inventory: Inventory): [number, number] {
  const totalGePiggy: [number, number] = [0, 0];
  for (const inventoryItem of inventory.items) {
      for (const afxRarity of [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]) {
      const count = inventoryItem.haveRarity[afxRarity];
      if (count > 0) {
        const currentAritfact = itemExpectedFullConsumption(
          inventoryItem.afxId,
          inventoryItem.afxLevel,
          afxRarity
        );
        totalGePiggy[0] += count * currentAritfact[0];
        totalGePiggy[1] += count * currentAritfact[1];
      }
    }
  }
  return totalGePiggy;
}
