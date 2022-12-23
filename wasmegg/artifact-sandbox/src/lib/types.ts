import { ArtifactSpec } from 'lib/sandbox/schema';

export interface ItemProps {
  id: string;

  afxId: ArtifactSpec.Name;
  afxLevel: ArtifactSpec.Level;
  afxRarity: ArtifactSpec.Rarity;

  familyId: string;
  familyName: string;

  tierId: string;
  name: string;
  tierNumber: number;
  tierName: string;
  rarity: string;
  display: string;

  effect: string;
  effectTarget: string;
  effectSize: string;
  effectDelta: number;
  slots: number;
  familyEffect: string;

  baseCraftingPrice: number;

  iconPath: string;
}
