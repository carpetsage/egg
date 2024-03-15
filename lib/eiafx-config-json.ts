import { ei } from './proto';
import data from './eiafx-config.json';
export default data as afxconfig;

type afxconfig = {
  missionParameters: SpaceshipParameters[];
  artifactParameters: ArtifactParameters[];
  craftingLevelInfos: CraftingLevelInfo[];
};

export interface SpaceshipParameters {
  ship: keyof typeof ei.MissionInfo.Spaceship;
  durations: MissionTypeParameters[];
  levelMissionRequirements: number[];
}

export interface MissionTypeParameters {
  durationType: keyof typeof ei.MissionInfo.DurationType;
  seconds: number;
  quality: number;
  minQuality: number;
  maxQuality: number;
  capacity: number;
  levelCapacityBump: number;
  levelQualityBump: number;
}

export interface ArtifactParameters {
  spec: {
    name: keyof typeof ei.ArtifactSpec.Name;
    level: keyof typeof ei.ArtifactSpec.Level;
    rarity: keyof typeof ei.ArtifactSpec.Rarity;
  };
  baseQuality: number;
  oddsMultiplier: number;
  value: number;
  craftingPrice: number;
  craftingPriceLow: number;
  craftingPriceDomain: number;
  craftingPriceCurve: number;
  craftingXp: number;
}

export interface CraftingLevelInfo {
  xpRequired: number;
  rarityMult: number;
}
