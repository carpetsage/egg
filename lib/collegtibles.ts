import { ei } from './proto';
import { customEggs, groupCustomEggsByDimension, SafeCustomEgg } from './eggs';

type Modifier = keyof typeof ei.GameModifier.GameDimension;
export type ValidModifier = Exclude<Modifier, 'INVALID'>;

/**
 * Represents a colleggtible buff with its associated egg, modifier type, and multiplier value.
 */
export interface ColleggtibleBuff {
  readonly eggId: string;
  readonly modifier: ei.GameModifier.GameDimension;
  readonly multiplier: number;
}

export type Modifiers = {
  earnings: number;
  awayEarnings: number;
  ihr: number;
  elr: number;
  shippingCap: number;
  habCap: number;
  vehicleCost: number;
  habCost: number;
  researchCost: number;
};

export const modifierKeys = Object.keys(ei.GameModifier.GameDimension).filter(x => x != 'INVALID') as ValidModifier[];
// Create map of string modifier name to enum value
const modifierNames = modifierKeys.map(m => ({ name: m, modifier: ei.GameModifier.GameDimension[m] }));

/**
 * Farm size thresholds for colleggtible progress tiers.
 * Each tier represents a milestone in contract completion.
 */
export const FARM_SIZE_TIERS = [
  10_000_000, // Tier 1: 10M chickens
  100_000_000, // Tier 2: 100M chickens
  1_000_000_000, // Tier 3: 1B chickens
  10_000_000_000, // Tier 4: 10B chickens
] as const;

export const defaultModifiers: Modifiers = {
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

export const FARM_SIZE_TIERS_LABELS = ['<10M', '10M', '100M', '1B', '10B'] as const;

export type ColleggtibleTiers = Record<string, number>;

export type ColleggtibleDimension =
  | 'earnings'
  | 'awayEarnings'
  | 'ihr'
  | 'elr'
  | 'shippingCap'
  | 'habCap'
  | 'vehicleCost'
  | 'habCost'
  | 'researchCost';

const DIMENSION_MAP: Record<number, ColleggtibleDimension> = {
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

const EFFECT_NAMES: Record<ColleggtibleDimension, string> = {
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

export interface ColleggtibleDef {
  id: string;
  name: string;
  effect: string;
  dimension: ColleggtibleDimension;
  tierValues: [number, number, number, number];
}

export const colleggtibleDefs: ColleggtibleDef[] = customEggs
  .filter(egg => egg.buffs && egg.buffs.length > 0)
  .map(egg => {
    const dimensionEnum = egg.buffs[0].dimension;
    const dimension = DIMENSION_MAP[dimensionEnum];
    if (!dimension) return null;
    const tierValues = egg.buffs.map(b => b.value);
    const paddedValues = [tierValues[0] ?? 1, tierValues[1] ?? 1, tierValues[2] ?? 1, tierValues[3] ?? 1] as [
      number,
      number,
      number,
      number,
    ];
    return {
      id: egg.identifier,
      name: egg.name,
      effect: EFFECT_NAMES[dimension],
      dimension,
      tierValues: paddedValues,
    };
  })
  .filter((def): def is ColleggtibleDef => def !== null);

export function getDefaultColleggtibleTiers(): ColleggtibleTiers {
  const tiers: ColleggtibleTiers = {};
  for (const def of colleggtibleDefs) {
    tiers[def.id] = -1;
  }
  return tiers;
}

export function getColleggtibleMultiplier(id: string, tierIndex: number): number {
  const def = colleggtibleDefs.find(d => d.id === id);
  if (!def || tierIndex < 0 || tierIndex > 3) return 1;
  return def.tierValues[tierIndex];
}

export function modifiersFromColleggtibleTiers(tiers: ColleggtibleTiers): Modifiers {
  const result: Modifiers = { ...defaultModifiers };

  for (const def of colleggtibleDefs) {
    const tierIndex = tiers[def.id] ?? -1;
    if (tierIndex >= 0 && tierIndex <= 3) {
      result[def.dimension] *= def.tierValues[tierIndex];
    }
  }

  return result;
}

export function formatColleggtibleBonus(multiplier: number, id?: string): string {
  if (multiplier === 1) return 'No bonus';
  if (id === 'chocolate' || id === 'wood') return `${multiplier.toFixed(1)}x`;
  const percent = (multiplier - 1) * 100;
  if (percent > 0) return `+${percent.toFixed(0)}%`;
  return `${(multiplier * 100).toFixed(0)}%`;
}

export function formatTier(tierIndex: number): string {
  if (tierIndex < 0) return 'None';
  return `Tier ${tierIndex + 1}`;
}

export function countUnresolvedContracts(backup: ei.IBackup): number {
  const allContracts = [...(backup.contracts?.archive ?? []), ...(backup.contracts?.contracts ?? [])];
  return allContracts.filter(c => !c.contract).length;
}

let _activeManualTiers: ColleggtibleTiers | null = null;

export function getActiveManualTiers(): ColleggtibleTiers | null {
  return _activeManualTiers;
}

export function setActiveManualTiers(tiers: ColleggtibleTiers | null): void {
  _activeManualTiers = tiers;
}

/**
 * Calculates all modifier values from colleggtibles in a backup.
 * If manual tiers are active via setActiveManualTiers(), uses those instead.
 */
export function allModifiersFromColleggtibles(backup: ei.IBackup) {
  if (_activeManualTiers) {
    return modifiersFromColleggtibleTiers(_activeManualTiers);
  }
  const colleggtibles = getAllColleggtibleProgress(backup);
  const modifiers = new Map<ValidModifier, number>(
    modifierNames.map(modifier => [modifier.name, modifierFromCollegtibles(colleggtibles, modifier.modifier)])
  );

  // Helper function to avoid constantly writing modifiers.get(modifier) ?? 1
  const getModifier = (modifier: ValidModifier) => modifiers.get(modifier) ?? 1;

  return {
    earnings: getModifier('EARNINGS'),
    awayEarnings: getModifier('AWAY_EARNINGS'),
    ihr: getModifier('INTERNAL_HATCHERY_RATE'),
    elr: getModifier('EGG_LAYING_RATE'),
    shippingCap: getModifier('SHIPPING_CAPACITY'),
    habCap: getModifier('HAB_CAPACITY'),
    vehicleCost: getModifier('VEHICLE_COST'),
    habCost: getModifier('HAB_COST'),
    researchCost: getModifier('RESEARCH_COST'),
  };
}
/**
 * Calculates the combined multiplier for a specific modifier type from all colleggtibles.
 * Multiplies all matching buff values together.
 */
function modifierFromCollegtibles(colleggtibles: ColleggtibleBuff[], modifier: ei.GameModifier.GameDimension) {
  return colleggtibles.filter(buff => buff.modifier === modifier).reduce((total, buff) => total * buff.multiplier, 1);
}

/**
 * Calculates the colleggtible progress tier for a specific egg based on contract performance.
 * Returns the buff multiplier value for the achieved tier, or 1 if no tier is reached.
 */
export function getColleggtibleProgress(contracts: ei.ILocalContract[], egg: SafeCustomEgg) {
  const maxFarmSize = Math.max(
    ...contracts.filter(c => c.contract?.customEggId === egg.identifier).map(c => c.maxFarmSizeReached ?? 0),
    0
  );

  const tier = FARM_SIZE_TIERS.findLastIndex(threshold => maxFarmSize >= threshold);
  return tier >= 0 ? (egg.buffs.at(tier)?.value ?? 0) : 1;
}

/**
 * Gets all colleggtible progress for each custom egg from the backup data.
 * Returns an array of buff objects with their calculated multipliers.
 */
export function getAllColleggtibleProgress(backup: ei.IBackup) {
  const allContracts = [...(backup.contracts?.archive ?? []), ...(backup.contracts?.contracts ?? [])];

  return customEggs.map(egg => ({
    eggId: egg.identifier,
    modifier: egg.buffs[0].dimension,
    multiplier: getColleggtibleProgress(allContracts, egg),
  }));
}

/**
 * Gets the colleggtible tier index achieved for each custom egg from backup data.
 * Returns a Record mapping egg identifier to tier index (-1 for no tier achieved, 0-3 for tiers 1-4).
 * This matches the colleggtibleTiers format used in the Config schema.
 */
export function getColleggtibleTiers(backup: ei.IBackup): Record<string, number> {
  const allContracts = [...(backup.contracts?.archive ?? []), ...(backup.contracts?.contracts ?? [])];
  const tiers: Record<string, number> = {};

  for (const egg of customEggs) {
    const maxFarmSize = Math.max(
      ...allContracts.filter(c => c.contract?.customEggId === egg.identifier).map(c => c.maxFarmSizeReached ?? 0),
      0
    );

    const tierIndex = FARM_SIZE_TIERS.findLastIndex(threshold => maxFarmSize >= threshold);
    tiers[egg.identifier] = tierIndex; // -1 if no tier achieved, 0-3 for tiers 1-4
  }

  return tiers;
}

/**
 * Calculates the maximum possible multiplier for a specific modifier from all colleggtibles.
 * Assumes all colleggtibles are at their maximum tier (tier 3 = 10B chickens).
 * Returns the product of all max tier multipliers for that modifier type.
 */
export function maxModifierFromColleggtibles(modifier: ei.GameModifier.GameDimension): number {
  return customEggs
    .filter(egg => egg.buffs.length > 0 && egg.buffs[0].dimension === modifier)
    .reduce((total, egg) => {
      // Get the value at the highest tier (index 3)
      const maxValue = egg.buffs[3]?.value ?? 1;
      return total * maxValue;
    }, 1);
}

export function allMaxModifiersFromColleggtibles() {
  const modifiers = new Map<ei.GameModifier.GameDimension, number>(
    groupCustomEggsByDimension().map(modifierGroup => [
      modifierGroup[0].buffs[0]?.dimension,
      modifierGroup.reduce((total, egg) => {
        const maxValue = egg.buffs[3]?.value ?? 1;
        return total * maxValue;
      }, 1),
    ])
  );

  return {
    earnings: modifiers.get(ei.GameModifier.GameDimension.EARNINGS) ?? 1,
    awayEarnings: modifiers.get(ei.GameModifier.GameDimension.AWAY_EARNINGS) ?? 1,
    ihr: modifiers.get(ei.GameModifier.GameDimension.INTERNAL_HATCHERY_RATE) ?? 1,
    elr: modifiers.get(ei.GameModifier.GameDimension.EGG_LAYING_RATE) ?? 1,
    shippingCap: modifiers.get(ei.GameModifier.GameDimension.SHIPPING_CAPACITY) ?? 1,
    habCap: modifiers.get(ei.GameModifier.GameDimension.HAB_CAPACITY) ?? 1,
    vehicleCost: modifiers.get(ei.GameModifier.GameDimension.VEHICLE_COST) ?? 1,
    habCost: modifiers.get(ei.GameModifier.GameDimension.HAB_COST) ?? 1,
    researchCost: modifiers.get(ei.GameModifier.GameDimension.RESEARCH_COST) ?? 1,
  };
}
