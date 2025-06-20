import { Config } from '../models';
import { groupCustomEggsByDimension, ei } from 'lib';

// Cache the grouped eggs for better performance
const eggsByDimension = Object.fromEntries(
  Object.entries(groupCustomEggsByDimension()).map(([dimension, eggs]) => [
    dimension,
    new Map(eggs.map(egg => [egg.identifier, egg]))
  ])
);

export function colleggtibleModifier(config: Config, modifier: ei.GameModifier.GameDimension): number {
  // Get the pre-indexed map of eggs for this dimension
  const dimensionEggMap = eggsByDimension[modifier] || new Map();

  return Object.entries(config.colleggtibleTiers).reduce((total, [eggId, tier]) => {
    const customEgg = dimensionEggMap.get(eggId);

    if (!customEgg) return total;

    // Get the tier-specific value (tier is 0-based index)
    const tierValue = tier >= 0 ? (customEgg.buffs.at(tier)?.value ?? 1) : 1;

    return total * tierValue;
  }, 1);
}
