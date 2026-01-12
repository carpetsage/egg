import { ei } from 'lib';
import { artifactSpecToItem } from '../catalog';
import { clarityEffect, researchPriceMultiplierFromArtifacts } from '../effects';
import { Artifact, Item, Stone } from '../types';
import { requiredWDLevelForEnlightenmentDiamond } from './hab_space';

export function homeFarmArtifacts(backup: ei.IBackup, virtue = false): Artifact[] {
  if (virtue) {
    return homeFarmVirtueArtifacts(backup);
  }
  const db = backup.artifactsDb;
  if (!db) {
    return [];
  }
  const inventory = db.inventoryItems;
  if (!inventory) {
    return [];
  }
  if (!db.activeArtifactSets || db.activeArtifactSets.length === 0) {
    return [];
  }
  const activeSet = db.activeArtifactSets[0];
  if (!activeSet.slots) {
    return [];
  }
  const itemIdToArtifact = new Map(inventory.map(item => [item.itemId!, item.artifact!]));
  const artifacts: Artifact[] = [];
  for (const slot of activeSet.slots) {
    if (!slot.occupied) {
      continue;
    }
    const artifact = itemIdToArtifact.get(slot.itemId!);
    if (artifact) {
      const hostItem = artifactSpecToItem(artifact.spec!);
      const stones = (artifact.stones || []).map(spec => artifactSpecToItem(spec));
      artifacts.push(newArtifact(hostItem, stones));
    }
  }
  return artifacts;
}

export function homeFarmVirtueArtifacts(backup: ei.IBackup): Artifact[] {
  const db = backup.artifactsDb?.virtueAfxDb;
  if (!db) {
    return [];
  }
  const inventory = db.inventoryItems;
  if (!inventory) {
    return [];
  }
  if (!db.activeArtifacts) {
    return [];
  }
  const activeSet = db.activeArtifacts;
  if (!activeSet.slots) {
    return [];
  }
  const itemIdToArtifact = new Map(inventory.map(item => [item.itemId!, item.artifact!]));
  const artifacts: Artifact[] = [];
  for (const slot of activeSet.slots) {
    if (!slot.occupied) {
      continue;
    }
    const artifact = itemIdToArtifact.get(slot.itemId!);
    if (artifact) {
      const hostItem = artifactSpecToItem(artifact.spec!);
      const stones = (artifact.stones || []).map(spec => artifactSpecToItem(spec));
      artifacts.push(newArtifact(hostItem, stones));
    }
  }
  return artifacts;
}

function newArtifact(hostItem: Item, stones: Stone[]): Artifact {
  return {
    ...hostItem,
    stones,
  };
}

// Given an artifact family, returns a list of owned artifacts of that family
export function artifactsFromInventory(backup: ei.IBackup, family: ei.ArtifactSpec.Name): Artifact[] {
  if (!backup.artifactsDb?.virtueAfxDb) {
    return [];
  }
  const inventory = backup.artifactsDb.virtueAfxDb?.inventoryItems;
  if (!inventory) {
    return [];
  }

  const bareArtifacts = <Artifact[]>[];
  const seenGussetKeys = new Set<string>();
  const recordArtifact = (spec: ei.IArtifactSpec) => {
    // Skip commons as they are useless for enlightenment.
    if (spec.name === family) {
      const gusset = newArtifact(artifactSpecToItem(spec), []);
      if (!seenGussetKeys.has(gusset.key)) {
        bareArtifacts.push(gusset);
        seenGussetKeys.add(gusset.key);
      }
    }
  };

  for (const item of inventory) {
    const spec = item.artifact!.spec!;
    recordArtifact(spec);
  }
  if (bareArtifacts.length === 0) {
    return [];
  }
  // Sort artifacts and clarity stones from higher to lower level, then higher to
  // lower rarity.
  bareArtifacts.sort((g1, g2) => g2.afxLevel - g1.afxLevel || g2.afxRarity - g1.afxRarity);
  return bareArtifacts.map(gusset => newArtifact(gusset, []));
}

export function bestPossibleCube(backup: ei.IBackup): Artifact | null {
  const cubes = artifactsFromInventory(backup, ei.ArtifactSpec.Name.PUZZLE_CUBE);
  if (cubes.length === 0) {
    return null;
  }
  let bestCube = null;
  let minPriceMultiplier = 1;
  for (const cube of cubes) {
    const priceMultiplier = researchPriceMultiplierFromArtifacts([cube]);
    if (priceMultiplier < minPriceMultiplier) {
      bestCube = cube;
      minPriceMultiplier = priceMultiplier;
    }
  }
  return bestCube;
}

export function bestPossibleCubeCTE(backup: ei.IBackup): Artifact | null {
  const cubes = artifactsFromInventory(backup, ei.ArtifactSpec.Name.PUZZLE_CUBE);
  if (cubes.length === 0) {
    return null;
  }
  let bestCube = null;
  let minPriceMultiplier = 1;
  for (const cube of cubes) {
    const priceMultiplier = researchPriceMultiplierFromArtifacts([cube]);
    const CTE = 1 / priceMultiplier;
    if (priceMultiplier < minPriceMultiplier) {
      bestCube = cube;
      minPriceMultiplier = priceMultiplier;
    }
  }
  return bestCube;
}
