import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { additiveEffect } from './common';

export function earningBonus(build: Build, config: Config): number {
  const peBonus = prophecyEggBonus(build, config);
  const peCount = config.prophecyEggs;
  const seBonus = soulEggBonus(build, config);
  const seCount = config.soulEggs;
  return seCount * seBonus * Math.pow(1 + peBonus, peCount);
}

export function earningBonusMultiplier(build: Build, config: Config): number {
  const peBonusBase = baseProphecyEggBonus(config);
  const peBonus = prophecyEggBonus(build, config);
  const peCount = config.prophecyEggs;
  const seBonusBase = baseSoulEggBonus(config);
  const seBonus = soulEggBonus(build, config);
  return Math.pow((1 + peBonus) / (1 + peBonusBase), peCount) * (seBonus / seBonusBase);
}

function prophecyEggBonus(build: Build, config: Config): number {
  return (
    baseProphecyEggBonus(config) +
    additiveEffect(build, config, [ArtifactSpec.Name.BOOK_OF_BASAN, ArtifactSpec.Name.PROPHECY_STONE])
  );
}

function baseProphecyEggBonus(config: Config): number {
  return 0.05 + 0.01 * config.prophecyBonus;
}

function soulEggBonus(build: Build, config: Config): number {
  return baseSoulEggBonus(config) + additiveEffect(build, config, [ArtifactSpec.Name.SOUL_STONE]);
}

function baseSoulEggBonus(config: Config): number {
  return 0.1 + 0.01 * config.soulFood;
}
