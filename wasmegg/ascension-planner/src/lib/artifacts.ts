import { allPossibleTiers } from 'lib/artifacts/data';
import { ei } from 'lib/proto';

/**
 * Artifact and stone data processing for the ascension planner.
 * Loads from lib/artifacts/data and provides structured options for selection.
 */

// Rarity codes
const RARITY_CODES = ['C', 'R', 'E', 'L'] as const;
type RarityCode = (typeof RARITY_CODES)[number];

// Stones to exclude (not useful for ascension planning)
const EXCLUDED_STONES = ['prophecy-stone', 'clarity-stone', 'dilithium-stone', 'soul-stone'];

/**
 * ArtifactOption, StoneOption, EquippedArtifact interfaces remain same...
 * But we need to define them again if they are not imported.
 */

/**
 * Artifact option representing a specific tier + rarity combination
 */
export interface ArtifactOption {
  id: string;           // Unique ID: "{familyId}-{tier}-{rarity}"
  familyId: string;     // e.g., "puzzle-cube"
  familyName: string;   // e.g., "Puzzle cube" (lowest tier name)
  tier: number;         // 1-4
  rarity: number;       // 0-3 (C, R, E, L)
  rarityCode: RarityCode;
  label: string;        // e.g., "T4L Puzzle cube"
  effect: string;       // e.g., "-50% research cost"
  effectDelta: number;  // e.g., -0.5
  effectTarget: string; // e.g., "research cost"
  slots: number;        // Number of stone slots (0-3)
  iconPath: string;     // e.g., "egginc/afx_puzzle_cube_4.png"
}

/**
 * Stone option representing a specific tier
 */
export interface StoneOption {
  id: string;           // Unique ID: "{familyId}-{tier}"
  familyId: string;     // e.g., "lunar-stone"
  familyName: string;   // e.g., "Lunar stone"
  tier: number;         // 2-4 (T1 is ingredient, not usable)
  label: string;        // e.g., "T4 Lunar stone"
  effect: string;       // e.g., "+40% away earnings"
  effectDelta: number;  // e.g., 0.4
  effectTarget: string; // e.g., "away earnings"
  iconPath: string;     // e.g., "egginc/afx_lunar_stone_4.png"
}

/**
 * Equipped artifact with optional stones
 */
export interface EquippedArtifact {
  artifactId: string | null;  // ArtifactOption.id or null if empty
  stones: (string | null)[];  // StoneOption.id for each slot, or null if empty
}

/**
 * Parse artifact families and generate all artifact options
 */
function parseArtifacts(): ArtifactOption[] {
  const options: ArtifactOption[] = [];

  for (const tier of allPossibleTiers) {
    // Only artifacts
    if (tier.afx_type !== ei.ArtifactSpec.Type.ARTIFACT) continue;

    if (!tier.effects) continue;

    for (const effect of tier.effects) {
      const rarityCode = RARITY_CODES[effect.afx_rarity];
      if (!rarityCode) continue;

      // Base name logic: get family name. 
      // tier.family is a reference in the data structure from lib/artifacts/data-json
      // Wait, allPossibleTiers elements have .family property?
      // Let's check lib/artifacts/data-json.ts structure if checkable.
      // Step 26 showed: import { Family, Tier } from './data-json';
      // We assume Tier has .family reference.
      // If not, we might need to look it up or rely on tier.name / tier.family.name
      // Data structure usually has circular refs or simple structure.
      // `data.artifact_families` -> `tiers` -> `family` (backref).
      // If flat map preserves objects, it should work.

      options.push({
        id: `${tier.family.id}-${tier.tier_number}-${effect.afx_rarity}`,
        familyId: tier.family.id,
        familyName: tier.family.name, // CAUTION: might need base name of family?
        // Local artifacts.ts used "baseName = family.name" where family was the group.
        tier: tier.tier_number,
        rarity: effect.afx_rarity,
        rarityCode,
        label: `T${tier.tier_number}${rarityCode} ${tier.family.name}`, // Or similar label logic
        effect: effect.effect,
        effectDelta: effect.effect_delta,
        effectTarget: effect.effect_target,
        slots: effect.slots || 0,
        iconPath: `egginc/${tier.icon_filename}`,
      });
    }
  }

  // Sort by family name, then tier, then rarity
  options.sort((a, b) => {
    if (a.familyName !== b.familyName) return a.familyName.localeCompare(b.familyName);
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.rarity - b.rarity;
  });

  return options;
}

/**
 * Parse stone families and generate all stone options
 */
function parseStones(): StoneOption[] {
  const options: StoneOption[] = [];

  for (const tier of allPossibleTiers) {
    if (tier.afx_type !== ei.ArtifactSpec.Type.STONE) continue;
    if (EXCLUDED_STONES.includes(tier.family.id)) continue;

    // Skip tier 1
    if (tier.tier_number === 1) continue;
    if (!tier.effects || tier.effects.length === 0) continue;

    const effect = tier.effects[0];

    options.push({
      id: `${tier.family.id}-${tier.tier_number}`,
      familyId: tier.family.id,
      familyName: tier.family.name,
      tier: tier.tier_number,
      label: `T${tier.tier_number} ${tier.family.name}`,
      effect: effect.effect,
      effectDelta: effect.effect_delta,
      effectTarget: effect.effect_target,
      iconPath: `egginc/${tier.icon_filename}`,
    });
  }

  // Sort by family name, then tier
  options.sort((a, b) => {
    if (a.familyName !== b.familyName) return a.familyName.localeCompare(b.familyName);
    return a.tier - b.tier;
  });

  return options;
}

// Pre-compute all options
export const artifactOptions = parseArtifacts();
export const stoneOptions = parseStones();

// Create lookup maps for quick access
const artifactMap = new Map(artifactOptions.map(a => [a.id, a]));
const stoneMap = new Map(stoneOptions.map(s => [s.id, s]));

/**
 * Get artifact option by ID
 */
export function getArtifact(id: string | null): ArtifactOption | null {
  if (!id) return null;
  return artifactMap.get(id) || null;
}

/**
 * Get stone option by ID
 */
export function getStone(id: string | null): StoneOption | null {
  if (!id) return null;
  return stoneMap.get(id) || null;
}

/**
 * Create an empty artifact loadout (4 empty slots)
 */
export function createEmptyLoadout(): EquippedArtifact[] {
  return [
    { artifactId: null, stones: [] },
    { artifactId: null, stones: [] },
    { artifactId: null, stones: [] },
    { artifactId: null, stones: [] },
  ];
}

/**
 * Get unique artifact families for grouping in dropdown
 */
export function getArtifactFamilies(): { id: string; name: string }[] {
  const seen = new Set<string>();
  const families: { id: string; name: string }[] = [];

  for (const opt of artifactOptions) {
    if (!seen.has(opt.familyId)) {
      seen.add(opt.familyId);
      families.push({ id: opt.familyId, name: opt.familyName });
    }
  }

  return families;
}

/**
 * Get artifact options for a specific family
 */
export function getArtifactsByFamily(familyId: string): ArtifactOption[] {
  return artifactOptions.filter(a => a.familyId === familyId);
}

/**
 * Get unique stone families for grouping
 */
export function getStoneFamilies(): { id: string; name: string }[] {
  const seen = new Set<string>();
  const families: { id: string; name: string }[] = [];

  for (const opt of stoneOptions) {
    if (!seen.has(opt.familyId)) {
      seen.add(opt.familyId);
      families.push({ id: opt.familyId, name: opt.familyName });
    }
  }

  return families;
}

/**
 * Get stone options for a specific family
 */
export function getStonesByFamily(familyId: string): StoneOption[] {
  return stoneOptions.filter(s => s.familyId === familyId);
}

/**
 * Individual effect contribution from an artifact or stone
 */
export interface ArtifactEffect {
  source: 'artifact' | 'stone';
  label: string;        // e.g., "T4L Demeters necklace" or "T4 Shell stone"
  effect: string;       // e.g., "+100% egg value"
  effectDelta: number;  // e.g., 1.0
  effectTarget: string; // e.g., "egg value"
}

/**
 * Calculated artifact modifiers for a specific effect target
 */
export interface ArtifactModifier {
  effectTarget: string;
  effects: ArtifactEffect[];      // Individual contributions
  totalMultiplier: number;        // Combined multiplier (1.0 = no effect)
  isMultiplicative: boolean;      // True for lunar stones (away earnings)
}

/**
 * All artifact modifiers calculated from a loadout
 */
export interface ArtifactModifiers {
  eggValue: ArtifactModifier;
  habCapacity: ArtifactModifier;
  shippingRate: ArtifactModifier;
  awayEarnings: ArtifactModifier;
  eggLayingRate: ArtifactModifier;
  internalHatcheryRate: ArtifactModifier;
  researchCost: ArtifactModifier;
}

// Effect targets that use multiplicative stacking (lunar stones)
const MULTIPLICATIVE_TARGETS = ['away earnings'];

/**
 * Calculate all artifact modifiers from an equipped loadout
 */
export function calculateArtifactModifiers(loadout: EquippedArtifact[]): ArtifactModifiers {
  // Collect all effects by target
  const effectsByTarget: Record<string, ArtifactEffect[]> = {};

  for (const slot of loadout) {
    // Get artifact effects
    const artifact = getArtifact(slot.artifactId);
    if (artifact) {
      const target = artifact.effectTarget;
      if (!effectsByTarget[target]) effectsByTarget[target] = [];
      effectsByTarget[target].push({
        source: 'artifact',
        label: artifact.label,
        effect: artifact.effect,
        effectDelta: artifact.effectDelta,
        effectTarget: target,
      });

      // Get stone effects
      for (const stoneId of slot.stones) {
        const stone = getStone(stoneId);
        if (stone) {
          const stoneTarget = stone.effectTarget;
          if (!effectsByTarget[stoneTarget]) effectsByTarget[stoneTarget] = [];
          effectsByTarget[stoneTarget].push({
            source: 'stone',
            label: stone.label,
            effect: stone.effect,
            effectDelta: stone.effectDelta,
            effectTarget: stoneTarget,
          });
        }
      }
    }
  }

  // Helper to calculate modifier for a target
  function calcModifier(target: string): ArtifactModifier {
    const effects = effectsByTarget[target] || [];
    const isMultiplicative = MULTIPLICATIVE_TARGETS.includes(target);

    let totalMultiplier: number;
    if (isMultiplicative) {
      // Multiplicative: (1 + delta1) * (1 + delta2) * ...
      totalMultiplier = effects.reduce((acc, e) => acc * (1 + e.effectDelta), 1);
    } else {
      // Additive: 1 + delta1 + delta2 + ...
      totalMultiplier = 1 + effects.reduce((acc, e) => acc + e.effectDelta, 0);
    }

    return {
      effectTarget: target,
      effects,
      totalMultiplier,
      isMultiplicative,
    };
  }

  return {
    eggValue: calcModifier('egg value'),
    habCapacity: calcModifier('hab capacity'),
    shippingRate: calcModifier('shipping rate'),
    awayEarnings: calcModifier('away earnings'),
    eggLayingRate: calcModifier('egg laying rate'),
    internalHatcheryRate: calcModifier('internal hatchery rate'),
    researchCost: calcModifier('research cost'),
  };
}

/**
 * Create empty artifact modifiers (all multipliers = 1)
 */
export function createEmptyArtifactModifiers(): ArtifactModifiers {
  const emptyModifier = (target: string, isMultiplicative = false): ArtifactModifier => ({
    effectTarget: target,
    effects: [],
    totalMultiplier: 1,
    isMultiplicative,
  });

  return {
    eggValue: emptyModifier('egg value'),
    habCapacity: emptyModifier('hab capacity'),
    shippingRate: emptyModifier('shipping rate'),
    awayEarnings: emptyModifier('away earnings', true),
    eggLayingRate: emptyModifier('egg laying rate'),
    internalHatcheryRate: emptyModifier('internal hatchery rate'),
    researchCost: emptyModifier('research cost'),
  };
}

/**
 * Parse equipped artifacts and stones from a player backup.
 * Specifically looks at the virtueAfxDb which is used for virtue eggs.
 */
export function getArtifactLoadoutFromBackup(backup: any): EquippedArtifact[] {
  const loadout = createEmptyLoadout();

  // Virtue eggs use a separate artifact database and active set
  const db = backup.artifactsDb?.virtueAfxDb;
  if (!db || !db.inventoryItems || !db.activeArtifacts?.slots) {
    return loadout;
  }

  const inventoryItems = db.inventoryItems || [];
  const activeArtifacts = db.activeArtifacts;
  const itemIdToArtifact = new Map<any, any>(inventoryItems.map((item: any) => [item.itemId, item.artifact]));

  for (let i = 0; i < Math.min(4, activeArtifacts.slots.length); i++) {
    const slot = activeArtifacts.slots[i];
    if (slot.occupied && slot.itemId !== undefined && slot.itemId !== null) {
      const artifact = itemIdToArtifact.get(slot.itemId);
      if (artifact && artifact.spec) {
        const spec = artifact.spec;

        // Find matching tier in allPossibleTiers
        const tier = allPossibleTiers.find(t => t.afx_id === spec.name && t.afx_level === spec.level);
        if (tier) {
          const artifactId = `${tier.family.id}-${tier.tier_number}-${spec.rarity || 0}`;

          // Parse stones
          const stones: (string | null)[] = [];
          if (artifact.stones) {
            for (const stoneSpec of artifact.stones) {
              const stoneTier = allPossibleTiers.find(t => t.afx_id === stoneSpec.name && t.afx_level === stoneSpec.level);
              if (stoneTier) {
                stones.push(`${stoneTier.family.id}-${stoneTier.tier_number}`);
              }
            }
          }

          loadout[i] = {
            artifactId,
            stones,
          };
        }
      }
    }
  }

  return loadout;
}
