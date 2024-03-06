import {
  ei,
  getArtifactTierPropsFromId,
  getMissionTypeFromId,
  itemExpectedFullConsumption,
  MissionType,
  targets,
} from 'lib';

import { config } from '@/store';
import lootdata, { MissionLevelLootStore, MissionLootStore } from './loot.json';

export { lootdata, ItemMissionLootStore };

export function hasMissionLootData(missionId: string): boolean {
  if (/atreggies/.test(missionId)) {
    return lootdata.missions.map(m => m.missionId).includes(missionId);
  }
  return true;
}

export function getMissionLootData(missionId: string): MissionLootStore {
  for (const missionLoot of lootdata.missions) {
    if (missionLoot.missionId === missionId) {
      return missionLoot;
    }
  }
  throw new Error(`there's no mission with id ${missionId}`);
}

export function getMissionLevelLootAverageConsumptionValue(
  levelLoot: MissionLevelLootStore,
  target: ei.ArtifactSpec.Name
): [number, number] {
  const loot = levelLoot.targets.find(x => x.targetAfxId == target);
  if (loot === undefined || loot.totalDrops === 0) {
    return [0, 0];
  }
  const total = [0, 0];
  for (const item of loot.items) {
    item.counts.forEach((count, afxRarity) => {
      if (count > 0) {
        const consValue = itemExpectedFullConsumption(item.afxId, item.afxLevel, afxRarity);
        total[0] += count * consValue[0];
        total[1] += count * consValue[1];
      }
    });
  }
  return [total[0] / loot.totalDrops, total[1] / loot.totalDrops];
}

type ItemLootStore = {
  missions: ItemMissionLootStore[];
};

type ItemMissionLootStore = {
  afxShip: ei.MissionInfo.Spaceship;
  targetAfxId: ei.ArtifactSpec.Name;
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
      mission.params.minQuality <= item.quality && item.quality <= mission.maxBoostedMaxQuality();
    const validTargets = mission.isFTL ? targets : [ei.ArtifactSpec.Name.UNKNOWN];
    for (const target of validTargets) {
      if (!config.value.targets[target] && item.afx_id != target) {
        continue;
      }
      const store: ItemMissionLootStore = {
        targetAfxId: target,
        afxShip: missionLoot.afxShip,
        afxDurationType: missionLoot.afxDurationType,
        missionId: missionLoot.missionId,
        levels: [],
      };
      let dropped = false;
      for (const levelLoot of missionLoot.levels) {
        let counts: [number, number, number, number] | undefined;
        for (const targetLoot of levelLoot.targets.filter(x => x.targetAfxId === target)) {
          for (const itemLoot of targetLoot.items) {
            if (itemLoot.itemId === itemId) {
              counts = itemLoot.counts;
              break;
            }
          }
          store.levels.push({
            level: levelLoot.level,
            totalDrops: targetLoot.totalDrops,
            counts: counts ?? [0, 0, 0, 0],
          });
        }
        if (counts && counts.some(x => x > 0)) {
          dropped = true;
        }
      }
      if (withinRange || dropped) {
        result.missions.push(store);
      }
    }
  }
  return result;
}

export function missionDataNotEnough(mission: MissionType, totalDrops: number) {
  return totalDrops / mission.defaultCapacity < 20;
}
