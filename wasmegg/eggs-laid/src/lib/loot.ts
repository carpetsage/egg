import {
  AfxTier,
  decodeCompleteMissionResponse,
  Effect,
  ei,
  getArtifactTierProps,
  requestAfxCompleteMissionRaw,
} from 'lib';
import { getLocalForage, setLocalForage } from './storage';

const missionIdsKey = `loot_ids`;
const missionKey = (missionId: string) => `loot:${missionId}`;

export async function getCompletedMission(
  userId: string,
  missionId: string
): Promise<ei.ICompleteMissionResponse | null> {
  const persisted = await loadMission(missionId);
  if (persisted !== null && persisted.artifacts && persisted.artifacts.length > 0) {
    return persisted;
  }
  const payload = await requestAfxCompleteMissionRaw(userId, missionId);
  let mission: ei.ICompleteMissionResponse;
  try {
    mission = decodeCompleteMissionResponse(payload);
  } catch (err) {
    console.error(err);
    throw new Error(`error decoding response of /ei_afx/complete_mission`);
  }
  if (mission.artifacts && mission.artifacts.length > 0) {
    await persistMission(missionId, payload);
  }
  return mission;
}

async function loadMission(missionId: string): Promise<ei.ICompleteMissionResponse | null> {
  const payload = await getLocalForage<string>(missionKey(missionId));
  if (!payload) {
    return null;
  }
  try {
    return decodeCompleteMissionResponse(payload);
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function persistMission(
  missionId: string,
  completeMissionResponsePayload: string
): Promise<void> {
  await setLocalForage(missionKey(missionId), completeMissionResponsePayload);
  const missionIds = (await getLocalForage<string[]>(missionIdsKey)) || [];
  if (missionIds.includes(missionId)) {
    return;
  }
  missionIds.push(missionId);
  await setLocalForage(missionIdsKey, missionIds);
}

export class Loot {
  items: LootItem[];

  constructor(mission: ei.ICompleteMissionResponse) {
    const keyToItemMap = new Map<string, LootItem>();
    for (const a of mission.artifacts || []) {
      const item = new LootItem(a.spec!.name!, a.spec!.level!, a.spec!.rarity!);
      if (keyToItemMap.has(item.key)) {
        keyToItemMap.get(item.key)!.count++;
      } else {
        keyToItemMap.set(item.key, item);
      }
    }
    this.items = [...keyToItemMap.values()];
  }

  get itemsSortedByQuality(): LootItem[] {
    return [...this.items].sort((l1, l2) => {
      if (l1.tierProps.quality !== l2.tierProps.quality) {
        return l1.tierProps.quality - l2.tierProps.quality;
      }
      if (l1.afxId !== l2.afxId) {
        return l1.afxId - l2.afxId;
      }
      return l1.afxRarity - l2.afxRarity;
    });
  }
}

export class LootItem {
  tierProps: AfxTier;
  afxRarity: ei.ArtifactSpec.Rarity;
  count: number;

  constructor(
    afxId: ei.ArtifactSpec.Name,
    afxLevel: ei.ArtifactSpec.Level,
    afxRarity: ei.ArtifactSpec.Rarity,
    count = 1
  ) {
    this.tierProps = getArtifactTierProps(afxId, afxLevel);
    this.afxRarity = afxRarity;
    this.count = count;
  }

  get key(): string {
    return `${this.tierProps.id}:${this.afxRarity}`;
  }

  get afxId(): ei.ArtifactSpec.Name {
    return this.tierProps.afx_id;
  }

  get afxLevel(): ei.ArtifactSpec.Level {
    return this.tierProps.afx_level;
  }

  get effect(): Effect | null {
    for (const effect of this.tierProps.effects ?? []) {
      if (effect.afx_rarity === this.afxRarity) {
        return effect;
      }
    }
    return null;
  }
}
