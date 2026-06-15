import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { aggregateEffect } from './common';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

export function researchPriceMultiplier(build: Build, config: Config): number {
  // Lab Upgrade epic research: -5% research cost per level (max level 10 = 50% off).
  const labUpgradeMultiplier = 1 + config.labUpgrade * -0.05;
  return (
    aggregateEffect(
      build,
      config,
      [ArtifactSpec.Name.PUZZLE_CUBE],
      (aggregate, effect) =>
        effect.multiplier <= 1
          ? (1 + effect.delta * effect.multiplier) * aggregate
          : ((1 + effect.delta) / effect.multiplier) * aggregate,
      1
    ) *
    colleggtibleModifier(config, ei.GameModifier.GameDimension.RESEARCH_COST) *
    labUpgradeMultiplier
  );
}

export function researchPriceDiscount(build: Build, config: Config): number {
  return researchPriceMultiplier(build, config) - 1;
}
