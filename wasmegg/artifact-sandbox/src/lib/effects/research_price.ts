import { Build, Config } from '../models';
import { ArtifactSpec } from '../proto';
import { aggregateEffect } from './common';
import { colleggtibleModifier } from './colleggtibles';
import { ei } from 'lib';

export function researchPriceMultiplier(build: Build, config: Config): number {
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
    ) * colleggtibleModifier(config, ei.GameModifier.GameDimension.RESEARCH_COST)
  );
}

export function researchPriceDiscount(build: Build, config: Config): number {
  return researchPriceMultiplier(build, config) - 1;
}
