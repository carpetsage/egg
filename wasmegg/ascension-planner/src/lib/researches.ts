import researchesRaw from '@/researches.json';

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

// Helper to calculate level from log (assuming log contains latest state or incremental upgrades?)
// Based on ResearchSection logic: we treat the log entry as a "state update" or find the max level.
// Ideally, the log tracks *purchases*. So if I buy L1, then L2, I have 2 entries?
// Or 1 entry "L2"?
// ResearchSection.vue buyResearch implementation:
/*
      const entry: ResearchLogEntry = {
        ...
        level: nextLevel,
        ...
      };
      props.step.researchLog.push(entry);
*/
// So it pushes a new entry with the NEW level.
// Getting the current level means finding the Entry with the highest level for that ID.
export function getResearchLevelFromLog(log: any[], researchId: string): number {
  if (!log) return 0;
  let maxLevel = 0;
  for (const entry of log) {
    if (entry.id === researchId && entry.level > maxLevel) {
      maxLevel = entry.level;
    }
  }
  return maxLevel;
}
