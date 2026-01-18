import { ei, Artifact, newItem } from 'lib';

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
      const hostItem = newItem(artifact.spec!);
      const stones = (artifact.stones || []).map(spec => newItem(spec));
      artifacts.push(new Artifact(hostItem, stones));
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
      const hostItem = newItem(artifact.spec!);
      const stones = (artifact.stones || []).map(spec => newItem(spec));
      artifacts.push(new Artifact(hostItem, stones));
    }
  }
  return artifacts;
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
  const seenArtifactKeys = new Set<string>();
  const recordArtifact = (spec: ei.IArtifactSpec) => {
    if (spec.name === family) {
      const artifact = new Artifact(newItem(spec), []);
      if (!seenArtifactKeys.has(artifact.key)) {
        bareArtifacts.push(artifact);
        seenArtifactKeys.add(artifact.key);
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
  // Sort artifacts from higher to lower level, then higher to lower rarity.
  bareArtifacts.sort((g1, g2) => g2.afxLevel - g1.afxLevel || g2.afxRarity - g1.afxRarity);
  return bareArtifacts.map(artifact => new Artifact(artifact.host, []));
}
