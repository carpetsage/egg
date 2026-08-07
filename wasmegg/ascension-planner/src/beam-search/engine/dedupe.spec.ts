import { describe, expect, test } from 'vitest';
import { dedupeByEarliestTime, researchLevelsKey, researchStateKey } from './dedupe';
import type { BeamSearchState } from './types';

function makeState(overrides: Partial<BeamSearchState> = {}): BeamSearchState {
  return {
    parent: null,
    purchase: null,
    phase: 1,
    researchLevels: {},
    bankValue: 0,
    population: 0,
    lastStepTime: 0,
    eggsDelivered: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    fuelTankAmounts: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    teEarned: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    activeSales: { research: false, hab: false, vehicle: false },
    earningsBoost: { active: false, multiplier: 1 },
    ...overrides,
  };
}

// Real common research ids (calculations/commonResearch.ts) — researchLevelsKey's canonical id list
// comes from getCommonResearches(), so an unrecognized id is silently ignored by design (a
// BeamSearchState should never carry one in practice); these tests need real ids to exercise it.
const RESEARCH_A = 'comfy_nests';
const RESEARCH_B = 'nutritional_sup';

describe('researchLevelsKey', () => {
  test('is independent of key insertion order', () => {
    const a = { [RESEARCH_A]: 3, [RESEARCH_B]: 1 };
    const b = { [RESEARCH_B]: 1, [RESEARCH_A]: 3 };
    expect(researchLevelsKey(a)).toBe(researchLevelsKey(b));
  });

  test('treats an absent research the same as an explicit 0', () => {
    const withZero = { [RESEARCH_A]: 0 };
    const absent = {};
    expect(researchLevelsKey(withZero)).toBe(researchLevelsKey(absent));
  });

  test('differs when any level differs', () => {
    expect(researchLevelsKey({ [RESEARCH_A]: 1 })).not.toBe(researchLevelsKey({ [RESEARCH_A]: 2 }));
  });

  test('ignores an unrecognized research id entirely', () => {
    expect(researchLevelsKey({ not_a_real_research: 5 })).toBe(researchLevelsKey({}));
  });
});

describe('researchStateKey', () => {
  test('two states with identical research levels but different phases get different keys', () => {
    const a = makeState({ phase: 1, researchLevels: { [RESEARCH_A]: 2 } });
    const b = makeState({ phase: 2, researchLevels: { [RESEARCH_A]: 2 } });
    expect(researchStateKey(a)).not.toBe(researchStateKey(b));
  });

  test('ignores fields other than phase and researchLevels', () => {
    const a = makeState({ phase: 1, researchLevels: { [RESEARCH_A]: 2 }, lastStepTime: 100, bankValue: 999 });
    const b = makeState({ phase: 1, researchLevels: { [RESEARCH_A]: 2 }, lastStepTime: 200, bankValue: 0 });
    expect(researchStateKey(a)).toBe(researchStateKey(b));
  });
});

describe('dedupeByEarliestTime', () => {
  test('keeps only the earliest state per (phase, researchLevels) group', () => {
    const early = makeState({ researchLevels: { [RESEARCH_A]: 1 }, lastStepTime: 100 });
    const late = makeState({ researchLevels: { [RESEARCH_A]: 1 }, lastStepTime: 200 });
    const { survivors, duplicatesRemoved } = dedupeByEarliestTime([late, early]);

    expect(survivors).toHaveLength(1);
    expect(survivors[0]).toBe(early);
    expect(duplicatesRemoved).toBe(1);
  });

  test('keeps distinct research configurations as separate survivors', () => {
    const a = makeState({ researchLevels: { [RESEARCH_A]: 1 } });
    const b = makeState({ researchLevels: { [RESEARCH_B]: 1 } });
    const { survivors, duplicatesRemoved } = dedupeByEarliestTime([a, b]);

    expect(survivors).toHaveLength(2);
    expect(duplicatesRemoved).toBe(0);
  });

  test('empty input produces empty output with zero duplicates', () => {
    const { survivors, duplicatesRemoved } = dedupeByEarliestTime([]);
    expect(survivors).toEqual([]);
    expect(duplicatesRemoved).toBe(0);
  });
});
