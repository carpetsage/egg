import { ei } from 'lib';
import { FamilyCore, TierCore } from 'lib/artifacts/data.json';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

declare const data: {
  families: Family[];
};
export default data;

export type Family = FamilyCore & {
  tiers: Tier[];
};

export type Tier = TierCore & {
  rarities: ConsumptionOutcome[];
  sources: Source[];
};

export type Source = TierCore & {
  afx_rarity: Rarity;
  deterministic: boolean;
  expected_yield: number;
};

// From wasmegg/_common/consumption/consumption.go
export type ConsumptionOutcome = {
  item: Item;
  deterministic: boolean;
  gold: number;
  expected_byproducts: ExpectedByproduct[];
  expected_gold: number;
  sample_byproducts: Byproduct[][];
  demotion_gold: number | null;
};

export type ExpectedByproduct = Item & {
  expected_count: number;
};

export type Byproduct = Item & {
  count: number;
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
