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

/**
 * The MAX_ROI_PAYBACK_SEARCH_SECONDS exclusion — found via a real diagnostics session (see
 * ../HANDOFF.md): a beam-search trace, diffed against a real manual plan for the same window,
 * showed the search buying meaningfully more shipping-capacity research (dark_containment,
 * neural_net_refine) than a human did. Root cause candidate: when laying rate (not shipping) is the
 * true bottleneck, effectiveLayRate.ts's min(layRate, shippingCapacity) means a shipping-capacity
 * purchase shows ~zero earningsDelta — it should never look worth buying, and this test locks in
 * that it's hard-excluded, not just deprioritized (deprioritization alone previously let it back in
 * via selectCandidates' now-removed fallback).
 */
describe('getLightweightPhaseCandidates: infinite/999-day-payback exclusion', () => {
  const context = makeTestContext();
  const baseState = makeAutoProgressedTestState(context);
  const mods = { labUpgradeLevel: 0, researchCostMultiplier: 1, puzzleCubeMultiplier: 1 };

  function shippingCategoryIds(): string[] {
    return getCommonResearches()
      .filter(r => categoriesOf(r.id).includes('shipping_capacity'))
      .map(r => r.id);
  }

  test('a shipping-capacity candidate is excluded once laying rate is the clear bottleneck', () => {
    // A single, real (non-empty) hab well below the fixture's default four-maxed-habs setup pulls
    // layRate below the fixture's own shippingCapacity (confirmed directly: 1.09B vs 3.19B in this
    // fixture) while still leaving a large, healthy earnings rate — deliberately NOT the far more
    // extreme "near-zero hab" override an earlier version of this test used, which crushed
    // offlineEarnings low enough to exclude every candidate for an unrelated reason (the
    // `offlineEarnings <= 0` guard / every candidate's delta shrinking together), not just shipping
    // ones specifically.
    const { frozen, initial } = splitEngineState({
      ...baseState,
      habIds: [14, null, null, null],
    });

    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    const shippingIds = new Set(shippingCategoryIds());
    const stillOffered = candidates.filter(c => shippingIds.has(c.researchId));

    expect(stillOffered).toEqual([]);
    // Sanity check this wasn't just an empty-candidates fluke — plenty of non-shipping research
    // should still be offered normally.
    expect(candidates.length).toBeGreaterThan(0);
  });

  test('the same shipping-capacity research IS offered without the vehicle override (control)', () => {
    const { frozen, initial } = splitEngineState(baseState);
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    const shippingIds = new Set(shippingCategoryIds());
    expect(candidates.some(c => shippingIds.has(c.researchId))).toBe(true);
  });
});
