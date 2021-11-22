import { ei } from '../proto';
import data, { Family, Tier } from './data.json';

export default data;
export type { Family as AfxFamily, Tier as AfxTier, Recipe, Effect } from './data.json';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Type = ei.ArtifactSpec.Type;

export const allPossibleTiers = data.artifact_families.map(f => f.tiers).flat();
const familyAfxIdToFamily: Map<Name, Family> = new Map(
  data.artifact_families.map(f => [f.afx_id, f])
);
const itemAfxIdToFamilyId: Map<Name, Name> = new Map(
  data.artifact_families
    .map(f => f.tiers)
    .flat()
    .map(t => [t.afx_id, t.family.afx_id])
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
