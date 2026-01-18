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
const FARM_SIZE_TIERS = [
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
/**
 * Calculates all modifier values from colleggtibles in a backup.
 * Returns a structured object with all game modifiers applied.
 */
export function allModifiersFromColleggtibles(backup: ei.IBackup) {
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
