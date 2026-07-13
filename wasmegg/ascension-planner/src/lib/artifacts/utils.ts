import { iconURL } from 'lib/utils';
import { allPossibleTiers } from 'lib/artifacts/data';
import { Artifact, newItem } from 'lib/artifacts';
import { ei } from 'lib';
import { EquippedArtifact } from './types';
import { getArtifact, getStone, stoneOptions } from './data';
import { createEmptyLoadout } from './calculator';

/**
 * Summarize an artifact loadout for display in action history.
 */
export function summarizeLoadout(loadout: EquippedArtifact[]): string {
  const parts: string[] = [];
  for (const slot of loadout) {
    const artifact = getArtifact(slot.artifactId);
    if (artifact) {
      parts.push(
        `T${artifact.tier}${artifact.rarityCode} <img src="${iconURL(artifact.iconPath, 32)}" class="h-4 w-4 inline-block align-middle -mt-0.5" title="${artifact.label}" />`
      );
    }
  }

  const stoneCounts = new Map<string, { label: string; count: number; order: number; iconPath: string }>();
  const stoneOrderMap = new Map(stoneOptions.map((s, i) => [s.id, i]));

  for (const slot of loadout) {
    for (const stoneId of slot.stones) {
      if (!stoneId) continue;
      const stone = getStone(stoneId);
      if (stone) {
        const existing = stoneCounts.get(stoneId);
        if (existing) {
          existing.count++;
        } else {
          stoneCounts.set(stoneId, {
            label: stone.label,
            count: 1,
            order: stoneOrderMap.get(stoneId) ?? 999,
            iconPath: stone.iconPath,
          });
        }
      }
    }
  }

  const sortedStones = Array.from(stoneCounts.values()).sort((a, b) => a.order - b.order);
  for (const stone of sortedStones) {
    parts.push(
      `${stone.count}x <img src="${iconURL(stone.iconPath, 32)}" class="h-3.5 w-3.5 inline-block align-middle -mt-0.5" title="${stone.label}" />`
    );
  }

  return parts.length > 0 ? parts.join(', ') : 'No artifacts equipped';
}



/**
 * Convert a lib Artifact to the planner's EquippedArtifact format.
 */
export function libArtifactToEquippedArtifact(afx: Artifact): EquippedArtifact {
  const tier = allPossibleTiers.find(t => t.afx_id === afx.afxId && t.afx_level === afx.afxLevel);
  if (!tier) {
    return { artifactId: null, stones: [] };
  }

  const artifactId = `${tier.family.id}-${tier.tier_number}-${afx.afxRarity}`;
  const stones = afx.stones.map(s => {
    const stoneTier = allPossibleTiers.find(t => t.afx_id === s.afxId && t.afx_level === s.afxLevel);
    return stoneTier ? `${stoneTier.family.id}-${stoneTier.tier_number}` : null;
  });

  return { artifactId, stones };
}

/**
 * Convert the planner's EquippedArtifact format (with stones) into lib `Artifact[]`,
 * the format consumed by the shared Clothed TE formulas (`cteFromArtifacts`, etc).
 * Inverse of {@link libArtifactToEquippedArtifact}.
 */
export function equippedArtifactsToLibArtifacts(loadout: EquippedArtifact[]): Artifact[] {
  const result: Artifact[] = [];
  for (const slot of loadout) {
    const option = getArtifact(slot.artifactId);
    if (!option) continue;
    const tier = allPossibleTiers.find(t => t.family.id === option.familyId && t.tier_number === option.tier);
    if (!tier) continue;

    const host = newItem({ name: option.afxId, level: tier.afx_level, rarity: option.rarity });
    const stones = slot.stones
      .map(id => getStone(id))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map(stone => allPossibleTiers.find(t => t.family.id === stone.familyId && t.tier_number === stone.tier))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map(t => newItem({ name: t.afx_id, level: t.afx_level, rarity: ei.ArtifactSpec.Rarity.COMMON }));

    result.push(new Artifact(host, stones));
  }
  return result;
}

/**
 * Parse equipped artifacts and stones from a player backup.
 */
export function getArtifactLoadoutFromBackup(backup: ei.IBackup): EquippedArtifact[] {
  const loadout = createEmptyLoadout();
  const db = backup.artifactsDb?.virtueAfxDb;
  if (!db) {
    return loadout;
  }
  const inventoryItems = db.inventoryItems || [];
  const activeArtifacts = db.activeArtifacts;
  if (!activeArtifacts || !activeArtifacts.slots) {
    return loadout;
  }
  const itemIdToArtifact = new Map<number, ei.ICompleteArtifact>(
    inventoryItems
      .filter(item => item.itemId !== undefined && item.itemId !== null && item.artifact)
      .map(item => [item.itemId!, item.artifact!])
  );

  for (let i = 0; i < Math.min(4, activeArtifacts.slots.length); i++) {
    const slot = activeArtifacts.slots[i];
    if (slot.occupied && slot.itemId !== undefined && slot.itemId !== null) {
      const artifact = itemIdToArtifact.get(slot.itemId);
      if (artifact && artifact.spec) {
        const spec = artifact.spec;
        const tier = allPossibleTiers.find(t => t.afx_id === spec.name && t.afx_level === spec.level);
        if (tier) {
          const artifactId = `${tier.family.id}-${tier.tier_number}-${spec.rarity || 0}`;
          const stones: (string | null)[] = [];
          if (artifact.stones) {
            for (const stoneSpec of artifact.stones) {
              const stoneTier = allPossibleTiers.find(
                t => t.afx_id === stoneSpec.name && t.afx_level === stoneSpec.level
              );
              if (stoneTier) {
                stones.push(`${stoneTier.family.id}-${stoneTier.tier_number}`);
              }
            }
          }
          loadout[i] = { artifactId, stones };
        }
      }
    }
  }
  return loadout;
}
