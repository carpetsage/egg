import {
  ei,
  getArtifactTierPropsFromId,
  getMissionTypeFromId,
  itemExpectedFullConsumptionGold,
  MissionType,
} from 'lib';

import lootdata, { MissionLevelLootStore, MissionLootStore } from './loot.json';

export { lootdata };

export function getMissionLootData(missionId: string): MissionLootStore {
  for (const missionLoot of lootdata.missions) {
    if (missionLoot.missionId === missionId) {
      return missionLoot;
    }
  }
  throw new Error(`there's no mission with id ${missionId}`);
}

export function getMissionLevelLootAverageConsumptionValue(loot: MissionLevelLootStore): number {
  if (loot.totalDrops === 0) {
    return 0;
  }
  let total = 0;
  for (const item of loot.items) {
    item.counts.forEach((count, afxRarity) => {
      if (count > 0) {
        total += count * itemExpectedFullConsumptionGold(item.afxId, item.afxLevel, afxRarity);
      }
    });
  }
  return total / loot.totalDrops;
}

type ItemLootStore = {
  missions: ItemMissionLootStore[];
};

type ItemMissionLootStore = {
  afxShip: ei.MissionInfo.Spaceship;
  afxDurationType: ei.MissionInfo.DurationType;
  missionId: string;
  levels: ItemMissionLevelLootStore[];
};

type ItemMissionLevelLootStore = {
  level: number;
  totalDrops: number;
  counts: [number, number, number, number];
};

export function getTierLootData(itemId: string): ItemLootStore {
  const item = getArtifactTierPropsFromId(itemId);
  const result: ItemLootStore = {
    missions: [],
  };
  for (const missionLoot of lootdata.missions) {
    const mission = getMissionTypeFromId(missionLoot.missionId);
    const withinRange =
      mission.params.minQuality <= item.quality && item.quality <= mission.params.maxQuality;
    const store: ItemMissionLootStore = {
      afxShip: missionLoot.afxShip,
      afxDurationType: missionLoot.afxDurationType,
      missionId: missionLoot.missionId,
      levels: [],
    };
    let dropped = false;
    for (const levelLoot of missionLoot.levels) {
      let counts: [number, number, number, number] | undefined;
      for (const itemLoot of levelLoot.items) {
        if (itemLoot.itemId === itemId) {
          counts = itemLoot.counts;
          break;
        }
      }
      store.levels.push({
        level: levelLoot.level,
        totalDrops: levelLoot.totalDrops,
        counts: counts ?? [0, 0, 0, 0],
      });
      if (counts && counts.some(x => x > 0)) {
        dropped = true;
      }
    }
    if (withinRange || dropped) {
      result.missions.push(store);
    }
  }
  return result;
}

export function missionDataNotEnough(mission: MissionType, totalDrops: number) {
  return totalDrops / mission.defaultCapacity < 20;
}
