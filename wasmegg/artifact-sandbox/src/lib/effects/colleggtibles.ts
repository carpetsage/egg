import { Config } from '../models';
import { groupCustomEggsByDimension, ei } from 'lib';

// Cache the grouped eggs for better performance
const eggsByDimension = groupCustomEggsByDimension();

export function colleggtibleModifier(config: Config, modifier: ei.GameModifier.GameDimension): number {
  // Get all eggs for this dimension
  const dimensionEggs = eggsByDimension[modifier] || [];

  return Object.entries(config.colleggtibleTiers).reduce((total, [eggId, tier]) => {
    const customEgg = dimensionEggs.find(egg => egg.identifier === eggId);

    if (!customEgg) return total;

    // Get the tier-specific value (tier is 0-based index)
    const tierValue = tier >= 0 ? (customEgg.buffs.at(tier)?.value ?? 1) : 1;

    return total * tierValue;
  }, 1);
}
