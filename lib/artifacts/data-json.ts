// This file was converted from data.schema.json by
// https://bcherny.github.io/json-schema-to-typescript-browser/, then cleaned up
// manually.

// This file was converted from data.schema.json by
// https://bcherny.github.io/json-schema-to-typescript-browser/, then cleaned up
// manually.

import { ei } from '../proto';
import data from './data.json';

type afxdata = {
  artifact_families: Family[];
};

export default data as afxdata;

import Type = ei.ArtifactSpec.Type;
import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

/**
 * A family consists of different tiers of the same artifact, stone (including fragment form), or ingredient.
 */
export type Family = FamilyCore & {
  /**
   * Empty for ingredients.
   */
  effect: string;
  /**
   * Effect without verbs like "increases", matches effect_target in child tiers. Empty for ingredients.
   */
  effect_target: string;
  tiers: Tier[];
};

/**
 * An item tier, or in other words, a specific item, with a name and an icon
 */
export type Tier = TierCore & {
  quality: number;
  /**
   * Whether the item is craftable (false for T1 items, true otherwise)
   */
  craftable: boolean;
  base_crafting_prices: number[];
  /**
   * Whether this item's family supports rarities, i.e., true only for artifacts (doesn't matter if this specific tier has only common rarity).
   */
  has_rarities: boolean;
  /**
   * Possible rarity variants of this item (null if has_rarities is false).
   */
  possible_afx_rarities: null | Rarity[];
  has_effects: boolean;
  available_from_missions: boolean;
  effects: null | Effect[];
  recipe: null | Recipe;
  /**
   * Whether all of this item's ingredients are available from missions.
   */
  ingredients_available_from_missions: boolean;
  /**
   * For an item unobtainable from missions, the hard dependencies are the highest level mission-obtainable items in the crafting ingredient tree; i.e., the ingredients must be gathered in order to craft the item in question, no way to skip them.
   */
  hard_dependencies: null | Ingredient[];
};

export type Ingredient = TierCore & {
  count: number;
};

export interface FamilyCore {
  /**
   * A human-readable unique ID of the family based on its name
   */
  id: string;
  afx_id: Name;
  name: string;
  /**
   * ArtifactSpec.Type enum value
   */
  afx_type: Type.ARTIFACT | Type.STONE | Type.INGREDIENT;
  /**
   * Human-readable type of the family
   */
  type: 'Artifact' | 'Stone' | 'Ingredient';
  /**
   * An unsigned integer key for sorting families based on type first, then the order of appearance on the quality ladder. This roughly matches how the game sorts families in the inventory system (with minor discrepancies around stones.)
   */
  sort_key: number;
  /**
   * afx_id's belonging to the family. For artifacts and ingredients, this only contains the family's own afx_id; for stones, this also contains the afx_id of the corresponding stone fragment.
   */
  child_afx_ids: Name[];
}

export interface TierCore {
  family: FamilyCore;
  /**
   * A human-readable unique ID of the family based on its family name and tier number
   */
  id: string;
  afx_id: Name;
  afx_level: Level;
  name: string;

  crafting_xp: number;
  odds_multiplier: number;
  /**
   * Positive tier number in the 4-tier structure of artifacts and stones (including fragments as tier 1), or 3-tier structure of ingredients.
   */
  tier_number: 1 | 2 | 3 | 4;
  /**
   * Name (qualifier) of the tier after stripping the common family name; 'Regular' if there's no specific qualifier.
   */
  tier_name: string;
  afx_type: Type;
  /**
   * Filename of the corresponding icon in the app's assets
   */
  icon_filename: string;
}

export interface Effect {
  afx_rarity: Rarity;
  rarity: string;
  /**
   * The full effect description
   */
  effect: string;
  /**
   * Effect description sans the effect size (amount), common to all rarity levels of the same item.
   */
  effect_target: string;
  effect_size: string;
  effect_delta: number;
  /**
   * Matches family's effect.
   */
  family_effect: string;
  odds_multiplier: number;
  /**
   * Number of slots; null if the family isn't supposed to have slots.
   */
  slots: number | null;
}

export interface Recipe {
  ingredients: Ingredient[];
  crafting_price: CraftingPriceParams;
}

export interface CraftingPriceParams {
  /**
   * ArtifactsConfigurationResponse.ArtifactParameters.crafting_price
   */
  base: number;
  /**
   * ArtifactsConfigurationResponse.ArtifactParameters.crafting_price_low
   */
  low: number;
  /**
   * ArtifactsConfigurationResponse.ArtifactParameters.crafting_price_domain
   */
  domain: number;
  /**
   * ArtifactsConfigurationResponse.ArtifactParameters.crafting_price_curve
   */
  curve: number;
  /**
   * Golden eggs cost of crafting this item for the first time
   */
  initial: number;
  /**
   * Minimum golden eggs cost of crafting this item
   */
  minimum: number;
}
