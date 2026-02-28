import { customEggs } from 'lib/eggs';
import { ei } from 'lib/proto';

/**
 * Colleggtible definitions and tier calculations.
 * Each colleggtible has 4 tiers based on max farm size reached in contracts.
 */

/**
 * Farm size thresholds for colleggtible progress tiers.
 * Index 0 = Tier 1 (10M), Index 3 = Tier 4 (10B)
 */
export const FARM_SIZE_TIERS = [
  10_000_000, // Tier 1: 10M chickens
  100_000_000, // Tier 2: 100M chickens
  1_000_000_000, // Tier 3: 1B chickens
  10_000_000_000, // Tier 4: 10B chickens
] as const;

/**
 * Colleggtible definition with buff values for each tier.
 * Values are multipliers (1.01 = +1%, 0.99 = -1%)
 */
export interface ColleggtibleDef {
  id: string;
  name: string;
  effect: string;
  dimension:
    | 'earnings'
    | 'awayEarnings'
    | 'ihr'
    | 'elr'
    | 'shippingCap'
    | 'habCap'
    | 'vehicleCost'
    | 'habCost'
    | 'researchCost';
  // Buff values for each tier (index 0 = tier 1, index 3 = tier 4)
  // Values are multipliers: >1 = bonus, <1 = discount
  tierValues: [number, number, number, number];
}

const DIMENSION_MAP: Record<number, ColleggtibleDef['dimension']> = {
  [ei.GameModifier.GameDimension.EARNINGS]: 'earnings',
  [ei.GameModifier.GameDimension.AWAY_EARNINGS]: 'awayEarnings',
  [ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE]: 'ihr',
  [ei.GameModifier.GameDimension.EGG_LAYING_RATE]: 'elr',
  [ei.GameModifier.GameDimension.SHIPPING_CAPACITY]: 'shippingCap',
  [ei.GameModifier.GameDimension.HAB_CAPACITY]: 'habCap',
  [ei.GameModifier.GameDimension.VEHICLE_COST]: 'vehicleCost',
  [ei.GameModifier.GameDimension.HAB_COST]: 'habCost',
  [ei.GameModifier.GameDimension.RESEARCH_COST]: 'researchCost',
};

const EFFECT_NAMES: Record<ColleggtibleDef['dimension'], string> = {
  earnings: 'Earnings',
  awayEarnings: 'Away earnings',
  ihr: 'IHR',
  elr: 'Lay rate',
  shippingCap: 'Shipping capacity',
  habCap: 'Hab capacity',
  vehicleCost: 'Vehicle cost',
  habCost: 'Hab cost',
  researchCost: 'Research cost',
};

/**
 * All colleggtible definitions with their buff values per tier.
 * Based on in-game data from lib/eggs.
 */
export const colleggtibleDefs: ColleggtibleDef[] = customEggs
  .filter(egg => egg.buffs && egg.buffs.length > 0)
  .map(egg => {
    const dimensionEnum = egg.buffs[0].dimension;
    const dimension = DIMENSION_MAP[dimensionEnum];

    if (!dimension) {
      // Fallback or skip if unknown dimension.
      // Returning 'earnings' as safe default but should ideally filter out.
      // But map must return value.
      // Assuming customEggs data is valid per our map.
      // If not, we might crash or have bad data.
      // For now, let's assume it maps correctly or return a dummy that we filter?
      // But colleggtibleDefs is typed as array.
      // Let's rely on filter below.
      return null;
    }

    const tierValues = egg.buffs.map(b => b.value);
    // Ensure we have 4 values (pad with 1 or last value?)
    // Game definition implies specific values.
    // Assuming customEggs has 4 buffs corresponding to tiers.
    // If not, padded with last value or 1.
    const paddedValues = [tierValues[0] ?? 1, tierValues[1] ?? 1, tierValues[2] ?? 1, tierValues[3] ?? 1] as [
      number,
      number,
      number,
      number,
    ];

    return {
      id: egg.identifier,
      name: egg.name,
      effect: EFFECT_NAMES[dimension], // Or derived from egg name/description?
      dimension,
      tierValues: paddedValues,
    };
  })
  .filter((def): def is ColleggtibleDef => def !== null);

/**
 * Colleggtible tiers for each colleggtible.
 * Value is -1 (no tier) or 0-3 (tier 1-4).
 */
export type ColleggtibleTiers = Record<string, number>;

/**
 * Get the default colleggtible tiers (all at -1 = no tier).
 */
export function getDefaultColleggtibleTiers(): ColleggtibleTiers {
  const tiers: ColleggtibleTiers = {};
  for (const def of colleggtibleDefs) {
    tiers[def.id] = -1;
  }
  return tiers;
}

/**
 * Get the multiplier for a specific colleggtible at a specific tier.
 * @param id Colleggtible ID
 * @param tierIndex Tier index (-1 = no tier, 0-3 = tier 1-4)
 * @returns Multiplier value (1.0 if no tier)
 */
export function getColleggtibleMultiplier(id: string, tierIndex: number): number {
  const def = colleggtibleDefs.find(d => d.id === id);
  if (!def || tierIndex < 0 || tierIndex > 3) return 1;
  return def.tierValues[tierIndex];
}

/**
 * Get all multipliers for all colleggtibles based on their tiers.
 */
export interface ColleggtibleModifiers {
  earnings: number;
  awayEarnings: number;
  ihr: number;
  elr: number;
  shippingCap: number;
  habCap: number;
  vehicleCost: number;
  habCost: number;
  researchCost: number;
}

/**
 * Calculate all colleggtible modifiers from tier data.
 * Multiplies together all colleggtibles that affect each dimension.
 */
export function calculateColleggtibleModifiers(tiers: ColleggtibleTiers): ColleggtibleModifiers {
  const modifiers: ColleggtibleModifiers = {
    earnings: 1,
    awayEarnings: 1,
    ihr: 1,
    elr: 1,
    shippingCap: 1,
    habCap: 1,
    vehicleCost: 1,
    habCost: 1,
    researchCost: 1,
  };

  for (const def of colleggtibleDefs) {
    const tierIndex = tiers[def.id] ?? -1;
    if (tierIndex >= 0 && tierIndex <= 3) {
      modifiers[def.dimension] *= def.tierValues[tierIndex];
    }
  }

  return modifiers;
}

/**
 * Extract colleggtible tiers from backup data.
 * Looks at contract archives and current contracts to find max farm size.
 */
export function getColleggtibleTiersFromBackup(
  contracts: {
    archive?: Array<{
      contract?: { customEggId?: string | null } | null;
      maxFarmSizeReached?: number | null;
    }> | null;
    contracts?: Array<{
      contract?: { customEggId?: string | null } | null;
      maxFarmSizeReached?: number | null;
    }> | null;
  } | null
): ColleggtibleTiers {
  const tiers = getDefaultColleggtibleTiers();

  if (!contracts) return tiers;

  const allContracts = [...(contracts.archive ?? []), ...(contracts.contracts ?? [])];

  // For each colleggtible, find the max farm size reached across all contracts
  for (const def of colleggtibleDefs) {
    const maxFarmSize = Math.max(
      ...allContracts.filter(c => c.contract?.customEggId === def.id).map(c => c.maxFarmSizeReached ?? 0),
      0
    );

    // Find the highest tier achieved
    const tierIndex = FARM_SIZE_TIERS.findLastIndex(threshold => maxFarmSize >= threshold);
    tiers[def.id] = tierIndex;
  }

  return tiers;
}

/**
 * Format tier display (0-3 => "Tier 1" - "Tier 4", -1 => "None")
 */
export function formatTier(tierIndex: number): string {
  if (tierIndex < 0) return 'None';
  return `Tier ${tierIndex + 1}`;
}

/**
 * Format multiplier as percentage bonus/discount
 */
export function formatColleggtibleBonus(multiplier: number, id?: string): string {
  if (multiplier === 1) return 'No bonus to';

  // Special formatting for specific eggs: show as Nx modifier (e.g., 3x instead of +200%)
  if (id === 'chocolate' || id === 'wood') {
    return `${multiplier.toFixed(1)}x`;
  }

  const percent = (multiplier - 1) * 100;
  if (percent > 0) return `+${percent.toFixed(0)}%`;
  // Show discounts as percentage of base (e.g., 0.95 => 95%)
  return `${(multiplier * 100).toFixed(0)}%`;
}
