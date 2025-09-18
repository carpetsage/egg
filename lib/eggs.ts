import { z } from 'zod/v4-mini';
import { ei } from './proto';
import { decodeMessage } from './api';
import customEggsRaw from './customeggs.json';

/**
 * Zod schema for game modifier buff validation
 */
const GameModifierBuffSchema = z.array(
  z.object({
    dimension: z.enum(ei.GameModifier.GameDimension),
    value: z.number(),
    description: z.optional(z.string()), // Optional description field
  })
);

/**
 * Zod schema for custom egg validation
 */
const CustomEggSchema = z.object({
  identifier: z.string(),
  name: z.string(),
  value: z.number(),
  buffs: GameModifierBuffSchema,
});

/**
 * Validated custom egg type derived from Zod schema
 */
export type SafeCustomEgg = z.infer<typeof CustomEggSchema> & {
  readonly description: string; // Always computed from eggIconPath
};

/**
 * Validates and transforms a protobuf custom egg into a safe custom egg using Zod
 */
function validateCustomEgg(ce: ei.ICustomEgg): SafeCustomEgg | null {
  // Basic validation that required fields exist
  if (!ce.identifier || !ce.name || !ce.value || !ce.buffs || ce.buffs.length === 0) {
    return null;
  }

  // Validate buffs have required fields
  const validBuffs = GameModifierBuffSchema.safeParse(ce.buffs);
  if (!validBuffs.success) {
    return null;
  }

  // Parse and validate with Zod
  const rawEgg = {
    identifier: ce.identifier,
    name: ce.name,
    value: ce.value,
    buffs: validBuffs.data,
  };

  const result = CustomEggSchema.safeParse(rawEgg);
  if (!result.success) {
    return null;
  }

  // Add computed description field
  return {
    ...result.data,
    description: eggIconPath(ei.Egg.CUSTOM_EGG, result.data.identifier, false),
  };
}

// parse custom eggs
export const customEggs = customEggsRaw
  .map(egg => validateCustomEgg(decodeMessage(ei.CustomEgg, egg, false)))
  .filter(egg => egg != null);

/**
 * Groups custom eggs by their GameDimension enum value.
 * Returns a SafeCustomEgg[][] where the index corresponds to the GameDimension enum value
 * and the value is an array of SafeCustomEggs whose dimension matches that value.
 *
 * GameDimension enum values:
 * 0: INVALID
 * 1: EARNINGS
 * 2: AWAY_EARNINGS
 * 3: INTERNAL_HATCHERY_RATE
 * 4: EGG_LAYING_RATE
 * 5: SHIPPING_CAPACITY
 * 6: HAB_CAPACITY
 * 7: VEHICLE_COST
 * 8: HAB_COST
 * 9: RESEARCH_COST
 */
export function groupCustomEggsByDimension(): SafeCustomEgg[][] {
  // Initialize array with empty arrays for each dimension (0-9)
  const grouped: SafeCustomEgg[][] = Array.from({ length: 10 }, () => []);

  for (const egg of customEggs) {
    // Get the dimension from the first buff (assuming all buffs in an egg have the same dimension)
    if (egg.buffs && egg.buffs.length > 0 && egg.buffs[0].dimension !== undefined) {
      const dimensionIndex = egg.buffs[0].dimension;
      // Ensure the dimension index is within our expected range
      if (dimensionIndex >= 0 && dimensionIndex < grouped.length) {
        grouped[dimensionIndex].push(egg);
      }
    }
  }

  return grouped;
}

export function eggName(egg: ei.Egg, custom_egg_id?: string | null): string {
  const symbol = egg in ei.Egg ? (egg === ei.Egg.CUSTOM_EGG ? custom_egg_id! : ei.Egg[egg]) : 'Unknown';
  switch (egg) {
    case ei.Egg.IMMORTALITY:
      return 'CRISPR';
    case ei.Egg.AI:
      return 'AI';
    default:
      console.log('symbol: ', symbol);
      return symbol
        .split(/[_-]/)
        .map(word => word[0].toUpperCase() + word.substring(1).toLowerCase())
        .join(' ');
  }
}

export function eggFromName(name: string) {
  const eggNameToEnumMap = new Map<string, ei.Egg>(eggList.map(egg => [eggName(egg), egg]));
  eggNameToEnumMap.set(eggName(ei.Egg.CUSTOM_EGG, name), ei.Egg.CUSTOM_EGG);

  return eggNameToEnumMap.get(name) ?? ei.Egg.UNKNOWN;
}

export function eggValue(egg: ei.Egg, custom_egg_id?: string | null): number {
  switch (egg) {
    case ei.Egg.EDIBLE:
      return 0.25;
    case ei.Egg.SUPERFOOD:
      return 1.25;
    case ei.Egg.MEDICAL:
      return 6.25;
    case ei.Egg.ROCKET_FUEL:
      return 30;
    case ei.Egg.SUPER_MATERIAL:
      return 150;
    case ei.Egg.FUSION:
      return 700;
    case ei.Egg.QUANTUM:
      return 3_000;
    case ei.Egg.IMMORTALITY:
      return 12_500;
    case ei.Egg.TACHYON:
      return 50_000;
    case ei.Egg.GRAVITON:
      return 175_000;
    case ei.Egg.DILITHIUM:
      return 525_000;
    case ei.Egg.PRODIGY:
      return 1_500_000;
    case ei.Egg.TERRAFORM:
      return 10_000_000;
    case ei.Egg.ANTIMATTER:
      return 1e9;
    case ei.Egg.DARK_MATTER:
      return 1e11;
    case ei.Egg.AI:
      return 1e12;
    case ei.Egg.NEBULA:
      return 1.5e13;
    case ei.Egg.UNIVERSE:
      return 1e14;
    case ei.Egg.ENLIGHTENMENT:
      return 1e-7;
    case ei.Egg.CURIOSITY:
      return 1;
    case ei.Egg.INTEGRITY:
      return 1;
    case ei.Egg.HUMILITY:
      return 1;
    case ei.Egg.RESILIENCE:
      return 1;
    case ei.Egg.KINDNESS:
      return 1;
    case ei.Egg.CHOCOLATE:
      return 5;
    case ei.Egg.EASTER:
      return 0.05;
    case ei.Egg.WATERBALLOON:
      return 0.1;
    case ei.Egg.FIREWORK:
      return 4.99;
    case ei.Egg.PUMPKIN:
      return 0.99;
    case ei.Egg.UNKNOWN:
      return 0;
    case ei.Egg.CUSTOM_EGG:
      return customEggs.find(egg => egg.identifier === custom_egg_id)?.value ?? 1;
    default:
      return 1;
  }
}

export function eggIconPath(egg: ei.Egg, custom_egg_id?: string | null, validate: boolean = true): string {
  switch (egg) {
    case ei.Egg.EDIBLE:
      return 'egginc/egg_edible.png';
    case ei.Egg.SUPERFOOD:
      return 'egginc/egg_superfood.png';
    case ei.Egg.MEDICAL:
      return 'egginc/egg_medical2.png';
    case ei.Egg.ROCKET_FUEL:
      return 'egginc/egg_rocketfuel.png';
    case ei.Egg.SUPER_MATERIAL:
      return 'egginc/egg_supermaterial.png';
    case ei.Egg.FUSION:
      return 'egginc/egg_fusion.png';
    case ei.Egg.QUANTUM:
      return 'egginc/egg_quantum.png';
    case ei.Egg.IMMORTALITY:
      return 'egginc/egg_crispr.png';
    case ei.Egg.TACHYON:
      return 'egginc/egg_tachyon.png';
    case ei.Egg.GRAVITON:
      return 'egginc/egg_graviton.png';
    case ei.Egg.DILITHIUM:
      return 'egginc/egg_dilithium.png';
    case ei.Egg.PRODIGY:
      return 'egginc/egg_prodigy.png';
    case ei.Egg.TERRAFORM:
      return 'egginc/egg_terraform.png';
    case ei.Egg.ANTIMATTER:
      return 'egginc/egg_antimatter.png';
    case ei.Egg.DARK_MATTER:
      return 'egginc/egg_darkmatter.png';
    case ei.Egg.AI:
      return 'egginc/egg_ai.png';
    case ei.Egg.NEBULA:
      return 'egginc/egg_vision.png';
    case ei.Egg.UNIVERSE:
      return 'egginc/egg_universe.png';
    case ei.Egg.ENLIGHTENMENT:
      return 'egginc/egg_enlightenment.png';
    case ei.Egg.CURIOSITY:
      return 'egginc/egg_curiosity.png';
    case ei.Egg.INTEGRITY:
      return 'egginc/egg_integrity.png';
    case ei.Egg.HUMILITY:
      return 'egginc/egg_humility.png';
    case ei.Egg.RESILIENCE:
      return 'egginc/egg_resilience.png';
    case ei.Egg.KINDNESS:
      return 'egginc/egg_kindness.png';
    case ei.Egg.CHOCOLATE:
      return 'egginc/egg_chocolate.png';
    case ei.Egg.EASTER:
      return 'egginc/egg_easter.png';
    case ei.Egg.WATERBALLOON:
      return 'egginc/egg_waterballoon.png';
    case ei.Egg.FIREWORK:
      return 'egginc/egg_firework.png';
    case ei.Egg.PUMPKIN:
      return 'egginc/egg_pumpkin.png';
    case ei.Egg.UNKNOWN:
      return 'egginc/egg_unknown.png';
    case ei.Egg.CUSTOM_EGG:
      return validate
        ? customEggs.some(egg => egg.identifier === custom_egg_id)
          ? `egginc/egg_${custom_egg_id?.replaceAll(/[-_]/g, '')}.png`
          : 'egginc/egg_unknown.png'
        : `egginc/egg_${custom_egg_id?.replaceAll(/[-_]/g, '')}.png`;
    default:
      return 'egginc/egg_unknown.png';
  }
}

export const eggList = [
  ei.Egg.EDIBLE,
  ei.Egg.SUPERFOOD,
  ei.Egg.MEDICAL,
  ei.Egg.ROCKET_FUEL,
  ei.Egg.SUPER_MATERIAL,
  ei.Egg.FUSION,
  ei.Egg.QUANTUM,
  ei.Egg.IMMORTALITY,
  ei.Egg.TACHYON,
  ei.Egg.GRAVITON,
  ei.Egg.DILITHIUM,
  ei.Egg.PRODIGY,
  ei.Egg.TERRAFORM,
  ei.Egg.ANTIMATTER,
  ei.Egg.DARK_MATTER,
  ei.Egg.AI,
  ei.Egg.NEBULA,
  ei.Egg.UNIVERSE,
  ei.Egg.ENLIGHTENMENT,
  ei.Egg.CURIOSITY,
  ei.Egg.INTEGRITY,
  ei.Egg.HUMILITY,
  ei.Egg.RESILIENCE,
  ei.Egg.KINDNESS,
  ei.Egg.CHOCOLATE,
  ei.Egg.EASTER,
  ei.Egg.WATERBALLOON,
  ei.Egg.FIREWORK,
  ei.Egg.PUMPKIN,
];
