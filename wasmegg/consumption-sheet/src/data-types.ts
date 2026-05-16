import { ei } from 'lib';
import type { FamilyCore, TierCore } from 'lib/artifacts/data-json';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

export type Family = FamilyCore & {
  tiers: Tier[];
};

export type Tier = Omit<TierCore, 'family' | 'crafting_xp' | 'odds_multiplier' | 'tier_number'> & {
  tier_number: number;
  rarities: ConsumptionOutcome[];
  sources: Source[];
};

export type Source = Omit<TierCore, 'family' | 'crafting_xp' | 'odds_multiplier' | 'tier_number'> & {
  tier_number: number;
  afx_rarity: Rarity;
  rarity: string;
  expected_yield: number;
};

// From wasmegg/_common/consumption/consumption.go

export type ConsumptionOutcome = {
  item: Item;
  raw_rewards: RawProduct[];
  product_rewards: ExpectedByproduct[];
  full_consumption: RawProduct[];
  demotion_gold: number | null;
};

export type ExpectedByproduct = Item & {
  expected_count: number;
};

export type RawProduct = {
  reward_type: number;
  reward_type_name: string;
  reward_amount: number;
};

export type Item = {
  afx_id: Name;
  afx_level: Level;
  afx_rarity: Rarity;
  id: string;
  name: string;
  tier_number: number;
  rarity: string;
  icon_filename: string;
};
