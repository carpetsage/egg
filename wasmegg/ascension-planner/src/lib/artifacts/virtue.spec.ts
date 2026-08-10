/**
 * getOptimalELRSet's stone-swap fast path (previousStoneAssignment) — added to speed up
 * rankResearchByELRImpact's 'realistic' mode, which calls getOptimalELRSet once per candidate per
 * purchase decision (see beam-search/HANDOFF.md's "Algorithm improvements" for the full cost
 * picture). The fast path's own doc comment (tryStoneSwapFastPath, not exported — exercised here
 * only through the public API) explains the swap-or-fall-back logic; these tests exist to prove the
 * one thing that actually matters: passing a hint NEVER changes the result, only how cheaply it's
 * reached. Every scenario below is asserted both ways (with vs. without the hint) rather than
 * asserting a hardcoded expected loadout, so these tests stay correct even if game data changes.
 *
 * Deliberately NOT reusing beam-search/engine/testFixtures.ts's MAXED_RAW_BACKUP (20x T4 of every
 * stone family) — that fixture has so much stone supply that every slot is always T4, which never
 * exercises tier variety or pool exhaustion. This file builds its own small, mixed-tier, limited-count
 * inventory instead, specifically to hit those edges.
 */
import { describe, expect, test } from 'vitest';
import { ei } from 'lib/proto';
import { allPossibleTiers } from 'lib/artifacts/data';
import { defaultModifiers } from 'lib/collegtibles';
import { artifactOptions } from './data';
import { getOptimalELRSet } from './virtue';
import type { EquippedArtifact } from './types';

function findTier(familyId: string, tierNumber: number) {
  return allPossibleTiers.find(t => t.family.id === familyId && t.tier_number === tierNumber);
}

/**
 * Two non-target T4 Legendary artifact families (anything other than Quantum Metronome/Interstellar
 * Compass/Ornate Gusset, which get special "keep top 2" treatment getOptimalELRSet doesn't need
 * here) with at least one stone slot each — picked at runtime rather than hardcoded by name, so this
 * doesn't silently break if game data changes which specific artifacts have slots.
 */
function pickTwoHolderFamilies(): string[] {
  const targetAfxIds = new Set([
    ei.ArtifactSpec.Name.QUANTUM_METRONOME,
    ei.ArtifactSpec.Name.INTERSTELLAR_COMPASS,
    ei.ArtifactSpec.Name.ORNATE_GUSSET,
  ]);
  const seen = new Set<string>();
  const families: string[] = [];
  for (const option of artifactOptions) {
    if (option.tier !== 4 || option.rarityCode !== 'L') continue;
    if (targetAfxIds.has(option.afxId as ei.ArtifactSpec.Name)) continue;
    if (option.slots <= 0) continue;
    if (seen.has(option.familyId)) continue;
    seen.add(option.familyId);
    families.push(option.familyId);
    if (families.length === 2) break;
  }
  if (families.length < 2) {
    throw new Error('Test setup: could not find two non-target T4 Legendary holder families with stone slots');
  }
  return families;
}

/**
 * A small backup: two holder artifacts (from pickTwoHolderFamilies) plus a deliberately limited,
 * mixed-tier stone supply — `tachyonCounts`/`quantumCounts` indexed by tier (2, 3, 4), e.g.
 * `{ 2: 1, 3: 1, 4: 1 }` for one of each tier. Real backup shape, same construction pattern
 * beam-search/engine/testFixtures.ts's buildMaxedRawBackup uses (verified against Inventory's own
 * constructor there, not guessed).
 */
function buildSmallBackup(
  holderFamilies: string[],
  tachyonCounts: Record<number, number>,
  quantumCounts: Record<number, number>
): ei.IBackup {
  const inventoryItems: ei.IArtifactInventoryItem[] = [];

  for (const familyId of holderFamilies) {
    const tier = findTier(familyId, 4);
    if (!tier) throw new Error(`Test setup: no T4 tier data for ${familyId}`);
    inventoryItems.push({
      artifact: {
        spec: { name: tier.afx_id, level: tier.afx_level, rarity: ei.ArtifactSpec.Rarity.LEGENDARY },
        stones: [],
      },
      quantity: 1,
    });
  }

  for (const [familyId, counts] of [
    ['tachyon-stone', tachyonCounts],
    ['quantum-stone', quantumCounts],
  ] as const) {
    for (const [tierStr, quantity] of Object.entries(counts)) {
      if (quantity <= 0) continue;
      const tier = findTier(familyId, Number(tierStr));
      if (!tier) throw new Error(`Test setup: no T${tierStr} tier data for ${familyId}`);
      inventoryItems.push({
        artifact: {
          spec: { name: tier.afx_id, level: tier.afx_level, rarity: ei.ArtifactSpec.Rarity.COMMON },
          stones: [],
        },
        quantity,
      });
    }
  }

  // A truthy (if otherwise empty) farms[0] entry — required for `assumeMaxHabsVehicles: true` to
  // actually take effect: evaluateStones (virtue.ts) only computes a maxed vehicle fleet when
  // `backup.farms?.[0]` exists at all, regardless of assumeMax, falling back to a single starter
  // vehicle otherwise. Confirmed directly: omitting this makes shipRate stay pinned near zero no
  // matter what research/stones are applied, an artificial, structurally-unbalanceable scenario
  // that isn't representative of a real backup.
  return { artifactsDb: { virtueAfxDb: { inventoryItems } }, farms: [{}] } as ei.IBackup;
}

function flatStones(loadout: EquippedArtifact[]): (string | null)[] {
  return loadout.flatMap(slot => slot.stones);
}

describe('getOptimalELRSet: stone-swap fast path (previousStoneAssignment)', () => {
  const holderFamilies = pickTwoHolderFamilies();
  const backup = buildSmallBackup(holderFamilies, { 2: 2, 3: 2, 4: 2 }, { 2: 2, 3: 2, 4: 2 });
  const fixedArtifactFamilies = holderFamilies.map(f => `${f}-4-${ei.ArtifactSpec.Rarity.LEGENDARY}`);

  // Baseline research levels — tuned (empirically, via a throwaway sweep script, not guessed) so
  // layRate and shipRate land close to balanced (~99.3% of each other) with this fixture's own
  // holder artifacts/stone supply. Deliberately NOT an arbitrary/low level set: getOptimalELRSet's
  // stone contribution is a small fine-tuning layer on top of a much bigger research-driven base
  // rate, so an arbitrary pick (e.g. just `comfy_nests`) tends to land wildly lopsided (shipping
  // capacity in particular swings enormously per level once maxed vehicles are in play) — a
  // structurally-unbalanceable state no swap could fix, which isn't representative of the common
  // case these tests exist to cover.
  const baseResearch: Record<string, number> = {
    comfy_nests: 30,
    autonomous_vehicles: 5,
    micro_coupling: 5,
    leafsprings: 4,
    lightweight_boxes: 4,
    driver_training: 4,
    super_alloy: 4,
    quantum_storage: 4,
    hover_upgrades: 4,
  };

  function optimalFor(commonResearch: Record<string, number>, previousStoneAssignment?: (string | null)[]) {
    return getOptimalELRSet(backup, {
      assumeMaxHabsVehicles: true,
      commonResearch,
      epicResearchLevels: {},
      colleggtibleModifiers: { ...defaultModifiers },
      fixedArtifactFamilies,
      previousStoneAssignment,
    });
  }

  test('identical result with and without a hint, at the exact same state (already balanced)', () => {
    const baseline = optimalFor(baseResearch);
    const hinted = optimalFor(baseResearch, flatStones(baseline));
    expect(hinted).toEqual(baseline);
  });

  test('identical result across a small one-level research bump (the common case)', () => {
    const baseline = optimalFor(baseResearch);
    const bumped = { ...baseResearch, comfy_nests: baseResearch.comfy_nests + 1 };

    const withoutHint = optimalFor(bumped);
    const withHint = optimalFor(bumped, flatStones(baseline));

    expect(withHint).toEqual(withoutHint);
  });

  test('identical result across a large research jump (fast path should decline and fall back)', () => {
    const baseline = optimalFor(baseResearch);
    const jumped = { ...baseResearch, comfy_nests: baseResearch.comfy_nests + 40, leafsprings: 20 };

    const withoutHint = optimalFor(jumped);
    const withHint = optimalFor(jumped, flatStones(baseline));

    expect(withHint).toEqual(withoutHint);
  });

  test('identical result when the stone pool is limited enough to force exhaustion', () => {
    // Only 1 tachyon stone total in the whole inventory — a large enough laying-side bump will
    // exceed what a single swap (or even the full search) can supply, forcing the "no stone
    // available to add" fallback path specifically.
    const scarceBackup = buildSmallBackup(holderFamilies, { 4: 1 }, { 2: 2, 3: 2, 4: 2 });
    const optimalForScarce = (commonResearch: Record<string, number>, previousStoneAssignment?: (string | null)[]) =>
      getOptimalELRSet(scarceBackup, {
        assumeMaxHabsVehicles: true,
        commonResearch,
        epicResearchLevels: {},
        colleggtibleModifiers: { ...defaultModifiers },
        fixedArtifactFamilies,
        previousStoneAssignment,
      });

    const baseline = optimalForScarce(baseResearch);
    const jumped = { ...baseResearch, comfy_nests: baseResearch.comfy_nests + 5 };

    const withoutHint = optimalForScarce(jumped);
    const withHint = optimalForScarce(jumped, flatStones(baseline));

    expect(withHint).toEqual(withoutHint);
  });

  test('identical result shifting the OTHER direction (shipping bump instead of laying)', () => {
    const baseline = optimalFor(baseResearch);
    const bumped = { ...baseResearch, leafsprings: 10 };

    const withoutHint = optimalFor(bumped);
    const withHint = optimalFor(bumped, flatStones(baseline));

    expect(withHint).toEqual(withoutHint);
  });

  /**
   * Directly exercises the "single swap succeeds" branch specifically — the other tests above all
   * land on either "hint is already balanced enough, no swap needed" or "no swap available at all,
   * fall back", because a real from-scratch fill against this fixture's own stone supply tends to
   * converge on an all-one-type assignment (nothing of the opposite type present TO remove) whenever
   * it's already leaning hard toward one side. A hand-built, deliberately mixed hint (not derived
   * from a real prior call) sidesteps that: it's an intentionally slightly-wrong-but-fixable
   * assignment for `baseResearch`'s own state, giving the swap logic something real to remove.
   */
  test('a deliberately mixed (non-optimal) hint gets corrected by a single swap', () => {
    const balanced = flatStones(optimalFor(baseResearch));
    // Same multiset composition as the real optimum, but swap out the lowest-tier quantum stone for
    // an extra tachyon — a plausible "one purchase ago" state a single correcting swap should fix.
    const quantumIdx = balanced.findIndex(s => s?.startsWith('quantum-stone'));
    expect(quantumIdx).toBeGreaterThanOrEqual(0);
    const mixedHint = [...balanced];
    mixedHint[quantumIdx] = 'tachyon-stone-2';

    const withoutHint = optimalFor(baseResearch);
    const withHint = optimalFor(baseResearch, mixedHint);

    expect(withHint).toEqual(withoutHint);
  });

  test('a hint of the wrong length (stale family/slot-count mismatch) is ignored, not misapplied', () => {
    const withoutHint = optimalFor(baseResearch);
    const withBadHint = optimalFor(baseResearch, ['tachyon-stone-4']); // wrong length for this loadout
    expect(withBadHint).toEqual(withoutHint);
  });
});
