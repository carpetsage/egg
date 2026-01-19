import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { allColleggtiblesModifiers } from './colleggtibles';
import { additiveEffect } from './common';
import { cteFromArtifacts, cteFromColleggtibles } from 'lib';

export function earningBonus(build: Build, config: Config, virtue = false): number {
  const peBonus = prophecyEggBonus(build, config);
  const peCount = config.prophecyEggs;
  const seBonus = soulEggBonus(build, config);
  const seCount = config.soulEggs;
  const teCount = config.truthEggs;
  return virtue ? 1.1 ** teCount - 1 : seCount * seBonus * Math.pow(1 + peBonus, peCount) * Math.pow(1.01, teCount);
}

export function earningBonusMultiplier(build: Build, config: Config, virtue = false): number {
  const peBonusBase = baseProphecyEggBonus(config);
  const peBonus = prophecyEggBonus(build, config);
  const peCount = config.prophecyEggs;
  const seBonusBase = baseSoulEggBonus(config);
  const seBonus = soulEggBonus(build, config);
  return Math.pow((1 + peBonus) / (1 + peBonusBase), peCount) * (seBonus / seBonusBase);
}

export function clothedTE(build: Build, config: Config) {
  const artis = build.artifacts.map(arti => arti.toStandardArtifact()).filter(a => a != null);
  const cteFromArtis = artis.length > 0 ? cteFromArtifacts(artis) : 0;
  const modifiers = allColleggtiblesModifiers(config);
  const cteFromColleggs = cteFromColleggtibles(modifiers);

  return cteFromArtis + cteFromColleggs;
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
