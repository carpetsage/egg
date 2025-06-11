import { Build, Config } from '../models';
import { customEggs, ei } from 'lib';

export function colleggtibleModifier(config: Config, modifier: ei.GameModifier.GameDimension): number {
  return Object.entries(config.colleggtibleTiers).reduce((total, [eggId, tier]) => {
    const customEgg = customEggs.find(egg => egg.identifier === eggId);
    if (!customEgg) return total;

    const buff = customEgg.buffs.find(buff => buff.dimension === modifier);
    if (!buff) return total;

    // Get the tier-specific value (tier is 0-based index)
    const tierValue = tier >= 0 && tier < customEgg.buffs.length ? customEgg.buffs[tier].value : 1;

    return total * tierValue;
  }, 1);
}

export function colleggtibleEarningsMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.EARNINGS);
}

export function colleggtibleAwayEarningsMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.AWAY_EARNINGS);
}

export function colleggtibleInternalHatcheryRateMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE);
}

export function colleggtibleEggLayingRateMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.EGG_LAYING_RATE);
}

export function colleggtibleShippingCapacityMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.SHIPPING_CAPACITY);
}

export function colleggtibleHabCapacityMultiplier(config: Config): number {
  return colleggtibleModifier(config, ei.GameModifier.GameDimension.HAB_CAPACITY);
}

export function colleggtibleVehicleCostDiscount(config: Config): number {
  return 1 / colleggtibleModifier(config, ei.GameModifier.GameDimension.VEHICLE_COST);
}

export function colleggtibleHabCostDiscount(config: Config): number {
  return 1 / colleggtibleModifier(config, ei.GameModifier.GameDimension.HAB_COST);
}

export function colleggtibleResearchCostDiscount(config: Config): number {
  return 1 / colleggtibleModifier(config, ei.GameModifier.GameDimension.RESEARCH_COST);
}
