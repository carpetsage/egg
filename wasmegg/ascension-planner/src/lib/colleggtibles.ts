/**
 * Colleggtible definitions and tier calculations.
 * Each colleggtible has 4 tiers based on max farm size reached in contracts.
 */

/**
 * Farm size thresholds for colleggtible progress tiers.
 * Index 0 = Tier 1 (10M), Index 3 = Tier 4 (10B)
 */
export const FARM_SIZE_TIERS = [
  10_000_000,     // Tier 1: 10M chickens
  100_000_000,    // Tier 2: 100M chickens
  1_000_000_000,  // Tier 3: 1B chickens
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
  dimension: 'earnings' | 'awayEarnings' | 'ihr' | 'elr' | 'shippingCap' | 'habCap' | 'vehicleCost' | 'habCost' | 'researchCost';
  // Buff values for each tier (index 0 = tier 1, index 3 = tier 4)
  // Values are multipliers: >1 = bonus, <1 = discount
  tierValues: [number, number, number, number];
}

/**
 * All colleggtible definitions with their buff values per tier.
 * Based on in-game data.
 */
export const colleggtibleDefs: ColleggtibleDef[] = [
  {
    id: 'carbon-fiber',
    name: 'Carbon Fiber',
    effect: 'Shipping capacity',
    dimension: 'shippingCap',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    effect: 'Away earnings',
    dimension: 'awayEarnings',
    tierValues: [1.25, 1.50, 2.00, 3.00], // +25%, +50%, +100%, +200%
  },
  {
    id: 'easter',
    name: 'Easter',
    effect: 'IHR',
    dimension: 'ihr',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
  {
    id: 'firework',
    name: 'Firework',
    effect: 'Earnings',
    dimension: 'earnings',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    effect: 'Shipping capacity',
    dimension: 'shippingCap',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
  {
    id: 'waterballoon',
    name: 'Waterballoon',
    effect: 'Research cost',
    dimension: 'researchCost',
    tierValues: [0.99, 0.98, 0.97, 0.95], // -1%, -2%, -3%, -5%
  },
  {
    id: 'lithium',
    name: 'Lithium',
    effect: 'Vehicle cost',
    dimension: 'vehicleCost',
    tierValues: [0.98, 0.96, 0.93, 0.90], // -2%, -4%, -7%, -10%
  },
  {
    id: 'flame-retardant',
    name: 'Flame Retardant',
    effect: 'Hab cost',
    dimension: 'habCost',
    tierValues: [0.99, 0.95, 0.88, 0.75], // -1%, -5%, -12%, -25%
  },
  {
    id: 'wood',
    name: 'Wood',
    effect: 'Away earnings',
    dimension: 'awayEarnings',
    tierValues: [1.10, 1.25, 1.50, 2.00], // +10%, +25%, +50%, +100%
  },
  {
    id: 'silicon',
    name: 'Silicon',
    effect: 'Lay rate',
    dimension: 'elr',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
  {
    id: 'pegg',
    name: 'P.E.G.G',
    effect: 'Hab capacity',
    dimension: 'habCap',
    tierValues: [1.01, 1.02, 1.03, 1.05], // +1%, +2%, +3%, +5%
  },
];

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

  const allContracts = [
    ...(contracts.archive ?? []),
    ...(contracts.contracts ?? []),
  ];

  // For each colleggtible, find the max farm size reached across all contracts
  for (const def of colleggtibleDefs) {
    const maxFarmSize = Math.max(
      ...allContracts
        .filter(c => c.contract?.customEggId === def.id)
        .map(c => c.maxFarmSizeReached ?? 0),
      0
    );

    // Find the highest tier achieved
    const tierIndex = FARM_SIZE_TIERS.findLastIndex(threshold => maxFarmSize >= threshold);
    tiers[def.id] = tierIndex;
  }

  console.log(tiers);

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
export function formatColleggtibleBonus(multiplier: number): string {
  if (multiplier === 1) return '—';
  const percent = (multiplier - 1) * 100;
  if (percent > 0) return `+${percent.toFixed(0)}%`;
  return `${percent.toFixed(0)}%`;
}
