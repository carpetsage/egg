import { ei } from 'lib';

declare const data: {
  missions: MissionLootStore[];
};

export default data;

export type MissionLootStore = {
  afxShip: ei.MissionInfo.Spaceship;
  afxDurationType: ei.MissionInfo.DurationType;
  missionId: string;
  levels: MissionLevelLootStore[];
};

export type MissionLevelLootStore = {
  level: number;
  totalDrops: number;
  items: ArtifactTierLootStore[];
};

export type ArtifactTierLootStore = {
  afxId: ei.ArtifactSpec.Name;
  afxLevel: ei.ArtifactSpec.Level;
  itemId: string;
  counts: [number, number, number, number];
};
