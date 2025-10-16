import { ei } from 'lib';

export interface Item {
  key: string;
  afxId: ei.ArtifactSpec.Name;
  afxLevel: ei.ArtifactSpec.Level;
  afxRarity: ei.ArtifactSpec.Rarity;
  name: string;
  rarity: string;
  effectTarget: string;
  effectSize: string;
  effectDelta: number;
  slots: number;
  iconPath: string;
}

export type Stone = Item;

export interface Artifact extends Item {
  stones: Stone[];
}

export interface Research {
  id: string;
  name: string;
  maxLevel: number;
  perLevel: number;
  epic?: boolean;
}

export interface ResearchInstance extends Research {
  level: number;
}
