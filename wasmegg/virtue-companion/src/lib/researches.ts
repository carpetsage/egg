import { researches as researchesRaw } from 'lib';

type ResearchType = 'common' | 'epic';
type ResearchCategory =
  | 'egg_laying_rate'
  | 'egg_value'
  | 'fleet_size'
  | 'hab_capacity'
  | 'hatchery_capacity'
  | 'hatchery_refill_rate'
  | 'internal_hatchery_rate'
  | 'running_chicken_bonus'
  | 'shipping_capacity';
type ResearchCategories = ResearchCategory | '' | 'egg_laying_rate,egg_value';
type ResearchEffectType = 'additive' | 'multiplicative';
type ResearchCompoundType = 'additive' | 'multiplicative';
type Research = {
  serial_id: number;
  id: string;
  name: string;
  type: ResearchType;
  tier?: number;
  categories: ResearchCategories;
  description: string;
  effect_type: ResearchEffectType;
  levels: number;
  per_level: number;
  levels_compound: ResearchCompoundType;
  prices: number[];
  virtue_prices: number[];
};

export const researches: Research[] = researchesRaw as Research[];

export const commonResearches = researches.filter(r => r.type === 'common');

export function getResearchesByCategory(category: string): Research[] {
  return researches.filter(r => r.categories && r.categories.includes(category));
}

export function getResearchById(id: string): Research | undefined {
  return researches.find(r => r.id === id);
}
