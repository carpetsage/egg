import { ei } from './proto';

declare const data: {
  missionParameters: SpaceshipParameters[];
  artifactParameters: ArtifactParameters[];
};

export default data;

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
}
