/**
 * Shared test-only fixture builders for the beam search engine's test suite. Not itself a *.spec.ts
 * file (vitest won't run it), just plain helpers every spec file below imports.
 *
 * Built to represent a well-progressed Curiosity player (per the user's own steer): maxed epic
 * research, maxed colleggtibles, a full inventory of T4 Legendary artifacts and 20x T4 lunar/
 * tachyon/quantum stones. Real game data is reused throughout (lib/epicResearch.ts's maxLevel
 * table, lib/collegtibles.ts's tier system, lib/artifacts/data.ts's artifact/stone catalog) rather
 * than hand-guessed numbers, for the same reason makeAutoProgressedTestState below reuses the real
 * auto-shift pipeline for research levels: authentic inputs produce authentic prices/earnings.
 */
import { ei } from 'lib';
import { allPossibleTiers } from 'lib/artifacts/data';
import {
  colleggtibleDefs,
  defaultModifiers,
  modifiersFromColleggtibleTiers,
  type ColleggtibleTiers,
} from 'lib/collegtibles';
import { VIRTUE_EGGS, type VirtueEgg } from '@/types';
import type { EngineState, SimulationContext } from '@/engine/types';
import { runC1 } from '@/auto/shifts/c1';
import { runC2 } from '@/auto/shifts/c2';
import { runR1 } from '@/auto/shifts/r1';
import { epicResearchDefs } from '@/lib/epicResearch';
import { artifactOptions } from '@/lib/artifacts/data';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { computeSnapshot } from '@/engine/compute';
import { simulateThresholdBuy } from '@/calculations/smartBuyPreview';
import { isResearchSaleActive } from '@/lib/events';

export function zeroVirtueEggRecord(): Record<VirtueEgg, number> {
  return Object.fromEntries(VIRTUE_EGGS.map(egg => [egg, 0])) as Record<VirtueEgg, number>;
}

/** Every epic research at its real maxLevel (lib.../epicResearch.ts's own definitions). */
export function maxedEpicResearchLevels(): Record<string, number> {
  return Object.fromEntries(epicResearchDefs.map(d => [d.id, d.maxLevel]));
}

/** Every colleggtible at its top tier (index 3 of 0-3 — lib/collegtibles.ts's own tier system). */
export function maxedColleggtibleModifiers() {
  const tiers: ColleggtibleTiers = Object.fromEntries(colleggtibleDefs.map(d => [d.id, 3]));
  return modifiersFromColleggtibleTiers(tiers);
}

function findTier(familyId: string, tierNumber: number) {
  return allPossibleTiers.find(t => t.family.id === familyId && t.tier_number === tierNumber);
}

/**
 * A synthetic ei.IBackup whose virtue artifact inventory holds one T4 Legendary of every artifact
 * family, plus 20x T4 of each of the three stone families that matter for Curiosity ELR (lunar,
 * tachyon, quantum) — per the user's explicit spec. Shaped exactly like a real backup's
 * artifactsDb.virtueAfxDb.inventoryItems (see lib/artifacts/inventory.ts's Inventory class, which
 * is what actually parses this — verified against its constructor, not guessed): each entry is
 * `{ artifact: { spec, stones: [] }, quantity }`, no itemId needed since nothing here reads
 * activeArtifacts (getOptimalELRSet computes its own optimal combination from inventory, it doesn't
 * look at what's currently equipped).
 */
function buildMaxedRawBackup(): ei.IBackup {
  const inventoryItems: ei.IArtifactInventoryItem[] = [];

  const t4Legendary = artifactOptions.filter(a => a.tier === 4 && a.rarityCode === 'L');
  for (const option of t4Legendary) {
    const tier = findTier(option.familyId, 4);
    if (!tier) continue;
    inventoryItems.push({
      artifact: { spec: { name: tier.afx_id, level: tier.afx_level, rarity: option.rarity }, stones: [] },
      quantity: 1,
    });
  }

  for (const familyId of ['lunar-stone', 'tachyon-stone', 'quantum-stone']) {
    const tier = findTier(familyId, 4);
    if (!tier) continue;
    inventoryItems.push({
      artifact: {
        spec: { name: tier.afx_id, level: tier.afx_level, rarity: ei.ArtifactSpec.Rarity.COMMON },
        stones: [],
      },
      quantity: 20,
    });
  }

  return {
    artifactsDb: { virtueAfxDb: { inventoryItems } },
  } as ei.IBackup;
}

const MAXED_RAW_BACKUP = buildMaxedRawBackup();

export function makeTestEngineState(overrides: Partial<EngineState> = {}): EngineState {
  // The optimal loadout out of MAXED_RAW_BACKUP's inventory against a bare (no common research)
  // state — used as the actually-equipped starting loadout below, so ordinary per-generation
  // snapshots (which read state.artifactLoadout directly, unlike Phase 3's own scoring which always
  // recomputes the optimal loadout regardless of what's "equipped") see real artifact bonuses too.
  const optimalLoadout = getOptimalELRSet(MAXED_RAW_BACKUP, {
    assumeMaxHabsVehicles: true,
    commonResearch: {},
    epicResearchLevels: maxedEpicResearchLevels(),
    colleggtibleModifiers: maxedColleggtibleModifiers(),
  });

  return {
    currentEgg: 'curiosity',
    shiftCount: 0,
    // Deliberately NOT near-zero: a real player driving the Curiosity auto-planner already has
    // substantial progress from prior ascensions. Confirmed by direct testing — the earlier
    // te: 10/soulEggs: 0 defaults made every OTHER virtue egg's economy (e.g. Integrity, which I1
    // shifts to and resets population/bank on) effectively earn nothing, which sent
    // runHabPurchasePlan's "time to afford the next hab" into the e30-seconds range for a habs
    // plan that's supposed to run to completion (Infinity time budget) — not a bug in that code,
    // just an unrealistic input it was never meant to handle. Values below (100 TE, 20 sextillion
    // soul eggs) per the user's own steer on what a realistic Curiosity player looks like.
    te: 100,
    soulEggs: 20e21,
    bankValue: 0,
    // Same hardcoded hab id calculations/realisticELR.ts's own "realistic" scoring already assumes
    // for its post-deadline transformation — reused here for consistency, not just convenience.
    habIds: [18, 18, 18, 18],
    vehicles: [{ vehicleId: 11, trainLength: 1 }],
    researchLevels: {},
    siloCount: 1,
    tankLevel: 0,
    artifactLoadout: optimalLoadout,
    activeArtifactSet: null,
    artifactSets: { earnings: null, elr: null },
    fuelTankAmounts: zeroVirtueEggRecord(),
    eggsDelivered: zeroVirtueEggRecord(),
    teEarned: zeroVirtueEggRecord(),
    population: 0,
    lastStepTime: 0,
    activeSales: { research: false, hab: false, vehicle: false },
    earningsBoost: { active: false, multiplier: 1 },
    ...overrides,
  };
}

export function makeTestContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    epicResearchLevels: maxedEpicResearchLevels(),
    colleggtibleModifiers: maxedColleggtibleModifiers(),
    ascensionStartTime: 1_700_000_000,
    planStartOffset: 0,
    assumeDoubleEarnings: false,
    rawBackup: MAXED_RAW_BACKUP,
    ...overrides,
  };
}

/** Same as makeTestContext but with everything at its unmodified default — colleggtibles at
 *  neutral (lib/collegtibles.ts's defaultModifiers), no epic research, no artifacts. Kept for
 *  tests that specifically want to exercise the "nothing owned" path (e.g. rawBackup missing
 *  entirely, or the empty-artifactsDb fallback in getOptimalELRSet/getOptimalEarningsSet). */
export function makeBareTestContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    epicResearchLevels: {},
    colleggtibleModifiers: { ...defaultModifiers },
    ascensionStartTime: 1_700_000_000,
    planStartOffset: 0,
    assumeDoubleEarnings: false,
    rawBackup: {} as ei.IBackup,
    ...overrides,
  };
}

/**
 * A realistic mid-progression starting point, per the user's own correction: beam search isn't
 * meant to run from a bare, zero-research ascension where hundreds of trivially-cheap purchases
 * exist — it's meant to kick in once ordinary research already takes several minutes to buy at
 * least, after normal progression has already been running for a while, with habs/vehicles/research
 * already built up.
 *
 * Research progression comes from the real production shifts (auto/shifts/c1.ts, c2.ts, r1.ts,
 * unchanged) rather than hand-guessed levels, for the same reason makeAutoProgressedTestState
 * always intended: authentic prices/earnings, not invented numbers.
 *
 * Deliberately does NOT run I1/K1/K2 (the auto pipeline's hab- and vehicle-purchase shifts) to get
 * there, unlike an earlier version of this function. Found by direct testing, not by inspection:
 * calculations/habPurchasePlan.ts's simulateHabPurchases derives fixed layRatePerChicken/
 * earningsPerEgg ratios from the tiny population right after a shift resets it (every 'shift'
 * action sets population: 1), then reapplies those ratios as its own virtual population grows back
 * up over many simulated hab-tier purchases — with C1's own heavily-leveled research already behind
 * it, those ratios can compound into nonsense (observed: multiple orders of magnitude past a valid
 * elapsed-time range, for both I1 and K2, across more than one te/soulEggs combination). That's
 * existing, shipped behavior (the real I1 shift, and the manual planner's own hab-buying UI go
 * through the same function) — worth its own separate look, not something to patch blindly here.
 * Sidestepping it is also simply correct for this fixture's purpose: every "realistic Curiosity"
 * calculation elsewhere in this codebase already assumes maxed habs/vehicles outright
 * (computeRealisticELR hardcodes them; getOptimalELRSet takes assumeMaxHabsVehicles: true) — so
 * simulating the purchase process at all was never necessary, only the end state.
 *
 * Finishes with a real Quick Buy sweep (calculations/smartBuyPreview.ts's simulateThresholdBuy —
 * the same dry-run behind the manual planner's actual Quick Buy button, unmodified), clearing out
 * anything affordable within QUICK_BUY_THRESHOLD_SECONDS. Per the user's own steer: a real player
 * would have already swept up every ultra-cheap research before ever reaching for beam search, so
 * leaving those in the candidate pool would only be testing an unrealistically noisy search space.
 */
const QUICK_BUY_THRESHOLD_SECONDS = 60;

export function makeAutoProgressedTestState(
  context: SimulationContext,
  overrides: Partial<EngineState> = {}
): EngineState {
  let state: EngineState = {
    ...makeTestEngineState(overrides),
    // Match auto/ascension.ts's own bare-ascension-start convention (deriveNextStartState) rather
    // than the manual-planner-flavored defaults in makeTestEngineState — C1 onward assumes it's
    // starting from scratch on the farm.
    population: 1,
    researchLevels: {},
    lastStepTime: 0,
  };
  let elapsed = 0;
  for (const run of [runC1, runC2, runR1]) {
    state.lastStepTime = elapsed;
    const result = run(state, context);
    elapsed += result.elapsedSeconds;
    state = result.endState;
  }

  const mods = {
    labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
    researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
    puzzleCubeMultiplier: calculateArtifactModifiers(state.artifactLoadout).researchCost.totalMultiplier,
  };
  const snapshot = computeSnapshot(state, context, { skipEpochConversion: true });
  const absoluteSimTime = context.ascensionStartTime + (state.lastStepTime - context.planStartOffset);
  const quickBuyPlan = simulateThresholdBuy(
    state.researchLevels,
    snapshot,
    context,
    mods,
    isResearchSaleActive(absoluteSimTime),
    QUICK_BUY_THRESHOLD_SECONDS
  );

  return { ...state, researchLevels: quickBuyPlan.endLevels, bankValue: quickBuyPlan.endSnapshot.bankValue };
}
