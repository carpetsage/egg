import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { additiveEffect } from './common';

export function maxRunningChickenBonusMultiplier(build: Build, config: Config): number {
  const maxRCBBase = baseMaxRunningChickenBonus(config);
  const maxRCB = maxRunningChickenBonus(build, config);
  return maxRCB / maxRCBBase;
}

export function maxRunningChickenBonus(build: Build, config: Config): number {
  return (
    baseMaxRunningChickenBonus(config) +
    additiveEffect(build, config, [ArtifactSpec.Name.VIAL_MARTIAN_DUST, ArtifactSpec.Name.TERRA_STONE])
  );
}

export function baseMaxRunningChickenBonus(config: Config): number {
  // Assume max common research.
  return config.RCB;
}
