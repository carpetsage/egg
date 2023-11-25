import { ei } from '../proto';

declare const data: Entry[];

export default data;

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

export interface Item {
  afx_id: Name;
  afx_level: Level;
  afx_rarity: Rarity;
  name: string;
  tier_number: 1 | 2 | 3 | 4;
  rarity: string;
}

export type Byproduct = Item & {
  expected_count: number;
};

export type Entry = {
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
