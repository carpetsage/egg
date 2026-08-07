/**
 * "Earliest identical research-state wins" pruning, per ../03-performance-and-optimization.md and
 * ../05-design-decisions.md. Two states in the same phase with identical research levels differ
 * only in how early they reached that point — purchases happen immediately when affordable, so
 * effective cash right after a purchase is ~0 either way, meaning the earlier state strictly
 * dominates: anything the later one could do from here, the earlier one can also do, sooner.
 *
 * Confirmed key (../06-egg-codebase-integration.md §8.3): phase + research configuration is
 * sufficient. Sale/earnings-boost state doesn't need to be part of the key — it's a pure function
 * of absoluteSimTime (lib/events.ts), not persistent state that could differ between two states
 * with identical research levels. Hab/vehicle/artifact loadout are confirmed frozen for the whole
 * run (§8.1), so they can't leak into the outcome either.
 */
import { getCommonResearches } from '@/calculations/commonResearch';
import type { ResearchLevels } from '@/types';
import type { BeamSearchState } from './types';

// Fixed, stable iteration order for hashing research levels — independent of Object.keys() order
// and of whether a given research is present at all in a state's researchLevels object (absent
// means level 0, same as an explicit 0). A plain string key is deliberately used for v1, per Part
// 3's "a simple string key is acceptable for the first version — optimize only after measurement."
const CANONICAL_RESEARCH_IDS = getCommonResearches().map(r => r.id);

/** Exported separately from researchStateKey (which adds phase) because it's also the right cache
 *  key for anything that depends only on research levels regardless of phase — e.g. macros.ts's
 *  Phase 3 artifact-optimization memoization. */
export function researchLevelsKey(levels: ResearchLevels): string {
  return CANONICAL_RESEARCH_IDS.map(id => levels[id] || 0).join(',');
}

export function researchStateKey(state: BeamSearchState): string {
  return `${state.phase}|${researchLevelsKey(state.researchLevels)}`;
}

export function dedupeByEarliestTime(states: BeamSearchState[]): {
  survivors: BeamSearchState[];
  duplicatesRemoved: number;
} {
  const bestByKey = new Map<string, BeamSearchState>();
  for (const state of states) {
    const key = researchStateKey(state);
    const existing = bestByKey.get(key);
    if (!existing || state.lastStepTime < existing.lastStepTime) {
      bestByKey.set(key, state);
    }
  }
  const survivors = Array.from(bestByKey.values());
  return { survivors, duplicatesRemoved: states.length - survivors.length };
}
