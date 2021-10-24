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
  expected_gold: number;
  expected_byproducts: Byproduct[] | null;
  expected_full_consumption_gold: number;
  demotion_gold: number | null;
};
