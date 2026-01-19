import { Config } from '../models';
import { groupCustomEggsByDimension, ei, Modifiers } from 'lib';

// Cache the grouped eggs for better performance
const eggsByDimension = Object.fromEntries(
  Object.entries(groupCustomEggsByDimension()).map(([dimension, eggs]) => [
    dimension,
    new Map(eggs.map(egg => [egg.identifier, egg])),
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

export function allColleggtiblesModifiers(config: Config): Modifiers {
  return {
    earnings: colleggtibleModifier(config, ei.GameModifier.GameDimension.EARNINGS),
    awayEarnings: colleggtibleModifier(config, ei.GameModifier.GameDimension.AWAY_EARNINGS),
    ihr: colleggtibleModifier(config, ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE),
    elr: colleggtibleModifier(config, ei.GameModifier.GameDimension.EGG_LAYING_RATE),
    shippingCap: colleggtibleModifier(config, ei.GameModifier.GameDimension.SHIPPING_CAPACITY),
    habCap: colleggtibleModifier(config, ei.GameModifier.GameDimension.HAB_CAPACITY),
    habCost: colleggtibleModifier(config, ei.GameModifier.GameDimension.HAB_COST),
    vehicleCost: colleggtibleModifier(config, ei.GameModifier.GameDimension.VEHICLE_COST),
    researchCost: colleggtibleModifier(config, ei.GameModifier.GameDimension.RESEARCH_COST),
  };
}
