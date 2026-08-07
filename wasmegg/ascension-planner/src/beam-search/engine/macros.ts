/**
 * Tier Unlock Macro and Phase 3 Delivery Macro — per ../01-overview.md through
 * ../05-design-decisions.md. Both wrap existing, unmodified game code; neither reimplements any
 * economic or tier-unlock rule. See ../06-egg-codebase-integration.md §1 for the concept map.
 */
import type { ResearchCostModifiers } from '@/calculations/commonResearch';
import { getTiers, isTierUnlocked } from '@/calculations/commonResearch';
import { computeRealisticELR } from '@/calculations/realisticELR';
import { MAX_SIMULATED_PURCHASES, runDeliveryBuyLoop } from '@/calculations/smartBuyPreview';
import { runTierUnlockMilestone } from '@/auto/shifts/helpers/milestones';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import { computeSnapshot } from '@/engine/compute';
import type { SimulationContext } from '@/engine/types';
import { researchLevelsKey } from './dedupe';
import {
  absoluteSimTimeOf,
  toEngineState,
  type BeamFrozenContext,
  type BeamSearchState,
  type Phase3MacroEdge,
  type TierMacroEdge,
} from './types';

/** Keyed by researchLevelsKey(finalLevels) — see runPhase3Macro's doc comment for why this cache
 *  exists and what it's scoped to. */
export type Phase3ScoreCache = Map<string, number>;

/**
 * Holds the winning artifact family selection (e.g. ["metronome-4-3", "compass-4-3"]) from the
 * FIRST real (non-cache-hit) getOptimalELRSet call in a run, reused as a fixed-family fast path for
 * every subsequent call — see runPhase3Macro's doc comment for the full reasoning. A single mutable
 * slot rather than a map: unlike Phase3ScoreCache (legitimately different per research
 * configuration), the premise here is that the winning FAMILY set is the same one answer for the
 * whole run regardless of research levels, only stone placement varies.
 */
export interface Phase3ArtifactFamilyCache {
  families: string[] | null;
}

/** The next tier the beam could invoke the Tier Unlock Macro for, or null if every tier is already
 *  unlocked (nothing left to macro toward). */
export function nextLockedTier(state: BeamSearchState): number | null {
  return getTiers().find(tier => !isTierUnlocked(state.researchLevels, tier)) ?? null;
}

/**
 * Runs the existing tier planner (auto/shifts/helpers/milestones.ts: runTierUnlockMilestone,
 * itself wrapping calculations/milestoneChain.ts: computeTierMilestoneChain) unchanged, capped at
 * whatever time remains before `deadline`. Returns null if the tier can't be unlocked within that
 * budget — mirroring auto/shifts/c3.ts's own handling of the identical situation ("there's no third
 * case where it succeeds but finishes late" — see that file's doc comment), so this macro action is
 * simply not a viable move from this state right now, not a partial result.
 */
export function runTierMacro(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  deadline: number
): { nextState: BeamSearchState; edge: TierMacroEdge } | null {
  const tier = nextLockedTier(state);
  if (tier === null) return null;

  const timeLimit = deadline - absoluteSimTimeOf(state, context);
  if (timeLimit <= 0) return null;

  const engineState = toEngineState(state, frozen);
  const result = runTierUnlockMilestone(engineState, context, tier, timeLimit);

  if (!isTierUnlocked(result.endState.researchLevels, tier)) return null;

  const researchIds = result.actions
    .filter((a): a is typeof a & { type: 'buy_research' } => a.type === 'buy_research')
    .map(a => (a.payload as { researchId: string }).researchId);

  const nextState: BeamSearchState = {
    parent: state,
    purchase: { kind: 'tierMacro', tier, researchIds },
    phase: state.phase,
    researchLevels: result.endState.researchLevels,
    bankValue: result.endState.bankValue,
    population: result.endState.population,
    lastStepTime: result.endState.lastStepTime,
    eggsDelivered: result.endState.eggsDelivered,
    fuelTankAmounts: result.endState.fuelTankAmounts,
    teEarned: result.endState.teEarned,
    activeSales: result.endState.activeSales,
    earningsBoost: result.endState.earningsBoost,
  };

  return { nextState, edge: nextState.purchase as TierMacroEdge };
}

/**
 * Runs the existing delivery planner (calculations/smartBuyPreview.ts: runDeliveryBuyLoop, wrapping
 * calculations/researchRanking.ts: rankResearchByELRImpact in 'realistic' mode) unchanged, buying
 * delivery-impact research until nothing more fits before `deadline`. Then applies the same
 * "realistic" post-deadline transformations (optimal artifacts + maxed habs/vehicles) the manual
 * planner's Delivery Impact tab already uses to score the result:
 * `score = min(finalLayRate, finalShippingRate)`, i.e. computeRealisticELR's `effectiveRate` —
 * verbatim the design docs' objective function. This is terminal: the returned edge is meant for
 * BeamTerminalResult, not for spawning further beam children.
 *
 * IMPORTANT: runDeliveryBuyLoop's own deadline enforcement (`showDeadlineWarning` inside
 * rankResearchByELRImpact) only fires while `isResearchSaleActive(absoluteSimTime)` is true — that
 * matches its real callers (c3.ts, the manual planner's "Buy Until Sale Ends" button), where the
 * passed deadline genuinely IS the end of an active sale. Here `deadline` is this engine's own
 * build-phase-end, which may not coincide with any sale at all — outside a sale window the
 * underlying loop enforces no deadline whatsoever and will happily keep buying for as long as
 * anything remains affordable. Confirmed by direct testing, not just reading the code: an early
 * version of this function returned a `lastPurchaseTime` days past `deadline` in a scenario with no
 * active sale. So the result is independently trimmed below to the deadline this engine actually
 * cares about, rather than trusting the loop's own stopping point.
 *
 * Returns null if `context.rawBackup` is unavailable — computeRealisticELR's whole pipeline (via
 * getOptimalELRSet) requires it, same precondition calculations/useResearchViews.ts's realistic ELR
 * view already has.
 *
 * `scoreCache`, when passed, memoizes the full result — getOptimalELRSet's combinatorial search
 * followed by computeRealisticELR — keyed by researchLevelsKey(finalLevels). Measured to help
 * (~50% hit rate in a real run) but not be sufficient alone: the beam genuinely visits many
 * distinct research configurations, so roughly half of all calls are still real cache misses.
 *
 * `artifactFamilyCache`, when passed, addresses the miss cost directly instead — and matters much
 * more than scoreCache, since it also covers the getOptimalELRSet calls buried inside
 * runDeliveryBuyLoop itself (calculations/researchRanking.ts's rankResearchByELRImpact, 'realistic'
 * mode, calls it once for a baseline, once per unpurchased candidate, and once per lookahead level
 * for candidates with non-positive immediate impact — multiplied again by runDeliveryBuyLoop
 * calling that function once per purchase it makes). Confirmed by reading getOptimalELRSet's own
 * implementation (lib/artifacts/virtue.ts), not just measurement: its candidate-gathering step
 * (which artifact families are even considered) depends only on the owned inventory
 * (backup.artifactsDb) — never on commonResearch/epicResearchLevels/colleggtibleModifiers. Only the
 * per-combination stone-balancing depends on research levels. So the expensive part — searching all
 * 1-4-artifact combinations, up to 495 of them — only ever needs to happen ONCE per run: primed
 * below with one direct full-search call against this state's own research levels before
 * runDeliveryBuyLoop ever runs, then threaded through both runDeliveryBuyLoop and the final scoring
 * call as a fixed selection, so neither pays the full search again. This assumes the winning family
 * selection doesn't change across the research-level range one search run explores — not something
 * candidate-gathering's inventory-only dependency *proves*, since the combinations themselves are
 * still scored using research-dependent hab/lay/shipping math, but confirmed as the expected/normal
 * case for this game's typical artifact balance, per the user's own steer.
 */
export function runPhase3Macro(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  deadline: number,
  scoreCache?: Phase3ScoreCache,
  artifactFamilyCache?: Phase3ArtifactFamilyCache
): { edge: Phase3MacroEdge; lastPurchaseTime: number } | null {
  if (!context.rawBackup) return null;

  const engineState = toEngineState(state, frozen);
  const absoluteSimTime = absoluteSimTimeOf(state, context);
  const snapshot = computeSnapshot(engineState, context, { skipGrowth: true });

  // Prime the family cache once, up front, so runDeliveryBuyLoop's own internal getOptimalELRSet
  // calls (see doc comment above) get the fast path from their very first call too, instead of only
  // benefiting once something else happens to populate the cache first.
  if (artifactFamilyCache && artifactFamilyCache.families === null) {
    const primed = getOptimalELRSet(context.rawBackup, {
      assumeMaxHabsVehicles: true,
      excludeGusset: false,
      commonResearch: state.researchLevels,
      epicResearchLevels: context.epicResearchLevels,
      colleggtibleModifiers: context.colleggtibleModifiers,
    });
    artifactFamilyCache.families = primed.filter(slot => slot.artifactId !== null).map(slot => slot.artifactId!);
  }
  const fixedArtifactFamilies = artifactFamilyCache?.families ?? undefined;

  const result = runDeliveryBuyLoop(
    state.researchLevels,
    snapshot,
    context,
    mods,
    absoluteSimTime,
    deadline,
    'realistic',
    'efficiency',
    context.rawBackup,
    MAX_SIMULATED_PURCHASES,
    fixedArtifactFamilies
  );

  // Trim to purchases that actually complete at-or-before `deadline` — see doc comment above — and
  // replay `endLevels` from the trimmed set rather than trusting the (possibly overshot) one the
  // loop itself returned.
  const trimmedPurchases = result.purchases.filter(p => p.purchaseTimestamp <= deadline);
  const finalLevels: Record<string, number> = { ...state.researchLevels };
  for (const p of trimmedPurchases) {
    finalLevels[p.researchId] = (finalLevels[p.researchId] || 0) + 1;
  }

  const cacheKey = scoreCache ? researchLevelsKey(finalLevels) : undefined;
  const cached = cacheKey !== undefined ? scoreCache!.get(cacheKey) : undefined;

  let finalScore: number;
  if (cached !== undefined) {
    finalScore = cached;
  } else {
    const optimal = getOptimalELRSet(context.rawBackup, {
      assumeMaxHabsVehicles: true,
      excludeGusset: false,
      commonResearch: finalLevels,
      epicResearchLevels: context.epicResearchLevels,
      colleggtibleModifiers: context.colleggtibleModifiers,
      fixedArtifactFamilies,
    });
    const artifactMods = calculateArtifactModifiers(optimal);
    const stats = computeRealisticELR(
      finalLevels,
      artifactMods,
      context.epicResearchLevels,
      context.colleggtibleModifiers
    );
    finalScore = stats.effectiveRate;
    if (cacheKey !== undefined) scoreCache!.set(cacheKey, finalScore);
  }

  const researchIds = trimmedPurchases.map(p => p.researchId);
  const lastPurchaseTime =
    trimmedPurchases.length > 0 ? trimmedPurchases[trimmedPurchases.length - 1].purchaseTimestamp : absoluteSimTime;

  return {
    edge: { kind: 'phase3Macro', researchIds, finalLevels, finalScore },
    lastPurchaseTime,
  };
}
