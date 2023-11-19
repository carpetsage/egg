import { ei } from '../proto';
import { iconURL } from '../utils';
import data, { Family, Tier } from './data.json';

export default data;
export type { Family as AfxFamily, Tier as AfxTier, Recipe, Effect } from './data.json';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Type = ei.ArtifactSpec.Type;

export type PlayerCraftingLevel = { level: number, rarityMult: number };

export const allPossibleTiers = data.artifact_families.map(f => f.tiers).flat();
const familyAfxIdToFamily: Map<Name, Family> = new Map(
  data.artifact_families.map(f => [f.afx_id, f])
);

const itemAfxIdToFile: Map<Name, string> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.icon_filename])
);
const itemAfxIdToFamilyId: Map<Name, Name> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.family.afx_id])
);
const itemAfxIdToFamilyName: Map<Name, string> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.family.name])
);
const itemIdToTier: Map<string, Tier> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.id, t])
);
const itemAfxIdToType: Map<Name, Type> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.afx_type])
);
const itemIdtoName: Map<Name, string> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.name])
);

export function afxMatchesTarget(afxId: Name, targetId: Name): boolean {
  if (targetId === 10000) {
    return false;
  }
  const afxFamily = itemAfxIdToFamilyName.get(afxId)!;
  const targetFamily = itemAfxIdToFamilyName.get(targetId)!;
  const afxType = itemAfxIdToType.get(afxId)!;
  const targetType = itemAfxIdToType.get(targetId)!;

  if (afxType === Type.STONE_INGREDIENT || targetType === Type.STONE_INGREDIENT) {
    return afxId === targetId;
  }
  return afxFamily === targetFamily;

}
export function getTargetName(afxId: Name): string {
  if (afxId === 10000) {
    return "Untargeted";
  }
  const familyName = itemAfxIdToFamilyName.get(afxId);
  const type = itemAfxIdToType.get(afxId)!;
  if (type === Type.STONE_INGREDIENT) {
    return itemIdtoName.get(afxId) ?? "Not Found";
  }
  return familyName ?? `Not Found 2: ${afxId}`
}

export function getTargetId(afxName: string) {
  for (const id of itemIdtoName.keys()) {
    if (getTargetName(id) == afxName) {
      return id;
    }
  }
  return 10000;
}

export function getArtifactName(afxId: Name): string {
  return itemIdtoName.get(afxId)!;
}

export function getImageUrlFromId(afxId: Name, size?: number): string {
  return iconURL(`egginc/${itemAfxIdToFile.get(afxId)!}`, size ?? 32);
}

export function getArtifactFamilyProps(afxId: Name): Family {
  return familyAfxIdToFamily.get(afxId)!;
}

export function getArtifactTierProps(afxId: Name, afxLevel: Level): Tier {
  const familyId = itemAfxIdToFamilyId.get(afxId)!;
  const type = itemAfxIdToType.get(afxId)!;
  let tierNumber = afxLevel;
  if (type === Type.STONE) {
    tierNumber = afxLevel + 1;
  }
  if (type === Type.STONE_INGREDIENT) {
    tierNumber = 0;
  }
  const tier = familyAfxIdToFamily.get(familyId)?.tiers[tierNumber];
  if (tier === undefined) {
    throw new Error(`there's no artifact tier with id ${afxId} and level ${afxLevel}`);
  }
  if (tier.afx_id !== afxId || tier.afx_level !== afxLevel) {
    throw new Error(
      `the impossible happened: getArtifactTierProps(${afxId}, ${afxLevel}) returned wrong item`
    );
  }
  return tier;
}

export function getArtifactTierPropsFromId(id: string): Tier {
  const tier = itemIdToTier.get(id);
  if (tier === undefined) {
    throw new Error(`there's no artifact tier with id ${id}`);
  }
  return tier;
}

// returns a valid crafting level if given a level outside the bounds
export function validateCraftingLevel(level: number) {
  if (level >= afxCraftingLevelInfos.length) {
    return afxCraftingLevelInfos.length;
  }
  else if (level <= 0) {
    return 1;
  }
  else {
    return level;
  }
}

export function getXPFromCraftingLevel(level: number) {
  if (level >= afxCraftingLevelInfos.length) { return 0; }
  if (level <= 0) { return afxCraftingLevelInfos[0].xpRequired!; }

  const levels = afxCraftingLevelInfos.slice(0,level - 1);
  return levels.map(x => x.xpRequired!).reduce((sum, levelXp) => sum + levelXp);
}

export function getCraftingLevelFromXp(craftingXp: number): PlayerCraftingLevel {
  let levelBaseXp = 0;
  const numLevels = afxCraftingLevelInfos.length;

  for (let level = 1; level <= numLevels; ++level) {
    const { xpRequired, rarityMult } = afxCraftingLevelInfos[level-1];

    if (xpRequired == null || rarityMult == null) {
      console.error(`crafting level ${level} doesn't have valid xpRequired and rarityMult data`)
      return { level: 1, rarityMult: 1}
    }

    const levelTargetXp = levelBaseXp + xpRequired;

    if (craftingXp <= levelTargetXp || level == numLevels) {
      return { level, rarityMult };
    }

    levelBaseXp += xpRequired;
  }

  return { level: 1, rarityMult: 1}
}


// This info was extracted from a manual API call to afx/config on 2023-06-14
// TODO: This should come from the data.json generation pipeline,
// need to refactor the Go tool to include this
export const afxCraftingLevelInfos: ei.ArtifactsConfigurationResponse.ICraftingLevelInfo[] = [
  {
    "xpRequired": 500,
    "rarityMult": 1
  },
  {
    "xpRequired": 2500,
    "rarityMult": 1.05
  },
  {
    "xpRequired": 5000,
    "rarityMult": 1.1
  },
  {
    "xpRequired": 10000,
    "rarityMult": 1.15
  },
  {
    "xpRequired": 25000,
    "rarityMult": 1.2
  },
  {
    "xpRequired": 50000,
    "rarityMult": 1.25
  },
  {
    "xpRequired": 100000,
    "rarityMult": 1.3
  },
  {
    "xpRequired": 250000,
    "rarityMult": 1.35
  },
  {
    "xpRequired": 500000,
    "rarityMult": 1.4
  },
  {
    "xpRequired": 1000000,
    "rarityMult": 1.45
  },
  {
    "xpRequired": 2000000,
    "rarityMult": 1.5
  },
  {
    "xpRequired": 4000000,
    "rarityMult": 1.55
  },
  {
    "xpRequired": 8000000,
    "rarityMult": 1.6
  },
  {
    "xpRequired": 15000000,
    "rarityMult": 1.65
  },
  {
    "xpRequired": 20000000,
    "rarityMult": 1.7
  },
  {
    "xpRequired": 35000000,
    "rarityMult": 1.75
  },
  {
    "xpRequired": 60000000,
    "rarityMult": 1.85
  },
  {
    "xpRequired": 100000000,
    "rarityMult": 2,
  },
  {
    "xpRequired": 150000000,
    "rarityMult": 2.25
  },
  {
    "xpRequired": 200000000,
    "rarityMult": 2.5
  },
  {
    "xpRequired": 250000000,
    "rarityMult": 3
  },
  {
    "xpRequired": 300000000,
    "rarityMult": 3.5
  },
  {
    "xpRequired": 325000000,
    "rarityMult": 4
  },
  {
    "xpRequired": 350000000,
    "rarityMult": 4.5
  },
  {
    "xpRequired": 400000000,
    "rarityMult": 5
  },
  {
    "xpRequired": 500000000,
    "rarityMult": 6
  },
  {
    "xpRequired": 600000000,
    "rarityMult": 7
  },
  {
    "xpRequired": 750000000,
    "rarityMult": 8
  },
  {
    "xpRequired": 1000000000,
    "rarityMult": 9
  },
  {
    "xpRequired": 1,
    "rarityMult": 10
  }
];
