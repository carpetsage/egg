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
    entry.expected_full_consumption_gold,
  ])
);

const itemKeyToDemotionGold = new Map<number, number | null>(
  data.map(entry => [
    itemKey(entry.item.afx_id, entry.item.afx_level, entry.item.afx_rarity),
    entry.demotion_gold,
  ])
);

export function itemExpectedFullConsumptionGold(
  afxId: Name,
  afxLevel: Level,
  afxRarity: Rarity
): number {
  const key = itemKey(afxId, afxLevel, afxRarity);
  const gold = itemKeyToExpectedFullConsumptionGold.get(key);
  if (gold === undefined) {
    throw new Error(
      `expected full consumption gold not available for ${afxId}:${afxLevel}:${afxRarity}`
    );
  }
  if (gold > 0 || afxRarity === Rarity.COMMON) {
    return gold;
  }

  // Consumption data not available for uncommon item, use demotion gold +
  // consumption gold of common counterpart.
  const demotionGold = itemKeyToDemotionGold.get(key);
  if (demotionGold === undefined || demotionGold === null) {
    throw new Error(`demotion gold not available for ${afxId}:${afxLevel}:${afxRarity}`);
  }
  const commonKey = itemKey(afxId, afxLevel, Rarity.COMMON);
  const commonGold = itemKeyToExpectedFullConsumptionGold.get(commonKey);
  if (commonGold === undefined) {
    throw new Error(
      `expected full consumption gold not available for ${afxId}:${afxLevel}:${Rarity.COMMON}`
    );
  }
  return demotionGold + commonGold;
}

export function inventoryExpectedFullConsumptionGold(inventory: Inventory): number {
  let total = 0;
  for (const inventoryItem of inventory.items) {
    for (const afxRarity of [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]) {
      const count = inventoryItem.haveRarity[afxRarity];
      if (count > 0) {
        total +=
          count *
          itemExpectedFullConsumptionGold(inventoryItem.afxId, inventoryItem.afxLevel, afxRarity);
      }
    }
  }
  return total;
}
