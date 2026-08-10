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
 * The negligible-relative-earnings-impact exclusion — found via a real diagnostics session (see
 * ../HANDOFF.md): a beam-search trace, diffed against a real manual plan for the same window,
 * showed the search buying meaningfully more shipping-capacity research (dark_containment,
 * neural_net_refine) than a human did. Root cause candidate: when laying rate (not shipping) is the
 * true bottleneck, effectiveLayRate.ts's min(layRate, shippingCapacity) means a shipping-capacity
 * purchase shows ~zero earningsDelta — it should never look worth buying, and this test locks in
 * that it's hard-excluded, not just deprioritized (deprioritization alone previously let it back in
 * via selectCandidates' now-removed fallback).
 */
describe('getLightweightPhaseCandidates: negligible relative earnings impact exclusion', () => {
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

  /**
   * Regression test for a real bug report (see ../HANDOFF.md): testers found the beam search's
   * winning plans never bought Multiversal Layering level 2 (10x earnings, one of the best
   * purchases available at this game stage) despite it being, in their own real play, the fastest
   * ROI item for the entire C3 window. Confirmed directly against this exact fixture: the OLD
   * absolute-roiSeconds exclusion (roiSeconds = price/earningsDelta vs. MAX_ROI_PAYBACK_SEARCH_SECONDS,
   * 999 days) excluded it here even though its earningsDelta is a full ~9x of current earnings
   * (level 0->1 is a flat 10x multiplier) — its price is just large enough, relative to this
   * fixture's still-growing earnings, that the ABSOLUTE flat-rate payback projection comes out to
   * roughly 387 million days. The relative-earnings-delta exclusion this test locks in doesn't
   * make that mistake: a ~9x relative jump is nowhere near NEGLIGIBLE_RELATIVE_EARNINGS_DELTA,
   * however long the naive flat-rate payback estimate would be.
   */
  test('multi_layering (Multiversal Layering) is NOT excluded despite its enormous absolute price', () => {
    const { frozen, initial } = splitEngineState(baseState);
    const candidates = getLightweightPhaseCandidates(initial, frozen, context, mods, 1);
    const ml2 = candidates.find(c => c.researchId === 'multi_layering');

    expect(ml2).toBeDefined();
    // Sanity check this is really the "huge relative impact, huge absolute price" case the bug
    // report was about, not a fixture that happens to make it cheap.
    expect(ml2!.price).toBeGreaterThan(1e40);
    expect(ml2!.earningsDelta).toBeGreaterThan(0);
  });
});
