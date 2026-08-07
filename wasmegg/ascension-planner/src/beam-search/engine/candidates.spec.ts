import { describe, expect, test } from 'vitest';
import { getCommonResearches, isTierUnlocked } from '@/calculations/commonResearch';
import { DELIVERY_IMPACT_CATEGORIES, ROI_EXCLUDED_CATEGORIES } from '@/calculations/researchRanking';
import { getLightweightPhaseCandidates } from './candidates';
import { splitEngineState } from './types';
import { makeAutoProgressedTestState, makeTestContext } from './testFixtures';

function categoriesOf(researchId: string): string[] {
  const research = getCommonResearches().find(r => r.id === researchId)!;
  return research.categories.split(',').map(c => c.trim());
}

describe('getLightweightPhaseCandidates', () => {
  const context = makeTestContext();
  const startState = makeAutoProgressedTestState(context);
  const { frozen, initial } = splitEngineState(startState);
  const mods = { labUpgradeLevel: 0, researchCostMultiplier: 1, puzzleCubeMultiplier: 1 };

  test('phase 1: never includes a non-ROI (excluded) category', () => {
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const cats = categoriesOf(c.researchId);
      expect(cats.some(cat => ROI_EXCLUDED_CATEGORIES.includes(cat))).toBe(false);
    }
  });

  test('phase 2: every candidate has at least one delivery-impact category', () => {
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 2);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const cats = categoriesOf(c.researchId);
      expect(cats.some(cat => DELIVERY_IMPACT_CATEGORIES.has(cat))).toBe(true);
    }
  });

  test("phase 2 candidate set is a subset of phase 1's, for the same state", () => {
    const phase1Ids = new Set(getLightweightPhaseCandidates(initial, frozen, context, mods, 1).map(c => c.researchId));
    const phase2Ids = getLightweightPhaseCandidates(initial, frozen, context, mods, 2).map(c => c.researchId);
    for (const id of phase2Ids) {
      expect(phase1Ids.has(id)).toBe(true);
    }
  });

  test('never returns an already-maxed or tier-locked research', () => {
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    for (const c of candidates) {
      const research = getCommonResearches().find(r => r.id === c.researchId)!;
      expect(c.fromLevel).toBeLessThan(research.levels);
      expect(isTierUnlocked(initial.researchLevels, research.tier)).toBe(true);
    }
  });

  test('toLevel is always exactly one more than fromLevel', () => {
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    for (const c of candidates) {
      expect(c.toLevel).toBe(c.fromLevel + 1);
    }
  });

  test('waitSeconds and price are non-negative finite numbers for every candidate', () => {
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    for (const c of candidates) {
      expect(c.price).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(c.waitSeconds) || c.waitSeconds === Infinity).toBe(true);
      if (Number.isFinite(c.waitSeconds)) {
        expect(c.waitSeconds).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
