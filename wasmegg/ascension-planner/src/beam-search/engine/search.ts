/**
 * The outer beam loop — see ../02-algorithm-specification.md for the game-agnostic spec this
 * follows, and ../06-egg-codebase-integration.md for how each piece maps onto this codebase.
 */
import type { ResearchCostModifiers } from '@/calculations/commonResearch';
import { applyAction, applyTime, boostTransitionsFrom } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import type { SimulationContext } from '@/engine/types';
import { createSimAction } from '@/types/actions/meta';
import { getLightweightPhaseCandidates, type LightweightCandidate } from './candidates';
import { dedupeByEarliestTime } from './dedupe';
import {
  nextLockedTier,
  runPhase3Macro,
  runTierMacro,
  type Phase3ArtifactFamilyCache,
  type Phase3ScoreCache,
} from './macros';
import {
  absoluteSimTimeOf,
  toEngineState,
  type BeamFrozenContext,
  type BeamSearchProgress,
  type BeamSearchState,
  type BeamTerminalResult,
} from './types';

/** Default outer-decision cap, mirroring the "guard rail, not a tuning knob" role
 *  MAX_SIMULATED_PURCHASES plays in calculations/smartBuyPreview.ts. `depth` here counts
 *  sequential actions along any single surviving path (one per generation), not total states
 *  expanded — Part 3 expects 10-200 purchases in a typical winning sequence, so this leaves ample
 *  margin without risking a runaway loop on a pathological input. */
const DEFAULT_MAX_DEPTH = 500;

// Exported alongside selectCandidates for the same reason — the oracle (oracle/beam-oracle.spec.ts)
// builds successor states with the exact same logic the beam itself uses.
export function applyResearchPurchase(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  candidate: LightweightCandidate
): BeamSearchState {
  const engineState = toEngineState(state, frozen);
  const snapshot = computeSnapshot(engineState, context, { skipGrowth: true });
  const action = createSimAction(
    'buy_research',
    { researchId: candidate.researchId, fromLevel: candidate.fromLevel, toLevel: candidate.toLevel },
    candidate.price
  );
  let nextEngineState = applyAction(engineState, action);
  nextEngineState = applyTime(nextEngineState, candidate.waitSeconds, snapshot, {
    transitions: boostTransitionsFrom(snapshot, absoluteSimTimeOf(state, context)),
  });
  const nextSnapshot = computeSnapshot(nextEngineState, context, { skipGrowth: true });

  return {
    parent: state,
    purchase: { kind: 'research', researchId: candidate.researchId, toLevel: candidate.toLevel },
    phase: state.phase,
    researchLevels: nextEngineState.researchLevels,
    bankValue: nextSnapshot.bankValue,
    population: nextSnapshot.population,
    lastStepTime: nextEngineState.lastStepTime,
    eggsDelivered: nextEngineState.eggsDelivered,
    fuelTankAmounts: nextEngineState.fuelTankAmounts,
    teEarned: nextEngineState.teEarned,
    activeSales: nextEngineState.activeSales,
    earningsBoost: nextEngineState.earningsBoost,
  };
}

export function phaseTransitionChild(state: BeamSearchState): BeamSearchState {
  return { ...state, parent: state, phase: 2, purchase: { kind: 'phaseTransition' } };
}

/**
 * Candidates worth generating a beam child for right now: those that clear the 70%-before-next-sale
 * bar (or are already landing inside a real sale), per the design in
 * ../06-egg-codebase-integration.md §4. Falls back to the full candidate list if none clear it, so
 * the search is never left with zero actions (e.g. no more sales remain, or every candidate is
 * genuinely still worth evaluating early in an ascension). This is also the main lever keeping the
 * branching factor near Part 3's assumed ~10 rather than the full unfiltered candidate count.
 */
// Exported for the exhaustive-search oracle (oracle/beam-oracle.spec.ts), which needs the exact
// same candidate-selection rule the beam itself uses — the oracle validates the beam's own
// width/throttle limits against an unlimited version of this same algorithm, not a different one.
export function selectCandidates(candidates: LightweightCandidate[]): LightweightCandidate[] {
  const passing = candidates.filter(c => c.meets70);
  return passing.length > 0 ? passing : candidates;
}

/**
 * Heuristic used to rank states by "how promising is this branch" when there's no real score to go
 * on. Only Phase 3 produces a real score (per ../02-algorithm-specification.md's "Scoring" section)
 * — intermediate states have none. This is an interpretation this integration had to make (the
 * design docs don't specify a non-terminal ranking function): offline earnings rate is used as a
 * proxy for future purchasing power, matching Phase 1's own stated goal in ../01-overview.md. Ties
 * fall back to earlier lastStepTime (Part 3's own tiebreak), then to insertion order, which
 * Array.prototype.sort's stability makes fully deterministic without needing an arbitrary third key.
 *
 * Used for two purposes: trimming deduped successors down to beamWidth, and picking which current
 * beam members are worth an expensive tier-macro attempt this generation (see
 * TIER_MACRO_ATTEMPTS_PER_GENERATION below).
 */
function rankByEarnings(
  states: BeamSearchState[],
  frozen: BeamFrozenContext,
  context: SimulationContext
): BeamSearchState[] {
  const withEarnings = states.map(state => ({
    state,
    earnings: computeSnapshot(toEngineState(state, frozen), context, { skipGrowth: true }).offlineEarnings,
  }));
  withEarnings.sort((a, b) => {
    if (a.earnings !== b.earnings) return b.earnings - a.earnings;
    return a.state.lastStepTime - b.state.lastStepTime;
  });
  return withEarnings.map(w => w.state);
}

/**
 * How many of the current beam's members get a tier-macro attempt each generation.
 *
 * The design docs (../02-algorithm-specification.md's expand()) call for offering the tier macro
 * to every state, every generation. Measured directly (see the timing probe this integration ran
 * before committing to this number): a single runTierUnlockMilestone call is cheap in isolation
 * (tens of ms), but nothing about it is incremental — every attempt recomputes a full lookahead
 * chain to the next tier threshold from scratch, even though a beam member's research levels only
 * change by one purchase between generations. Offered to every beam member every generation, that
 * turns into thousands of near-identical full-chain recomputations over a realistic run (beamWidth
 * x generations), dwarfing every other cost in the search. Restricting it to the current
 * generation's most promising members (by the same earnings heuristic rankByEarnings already uses)
 * keeps the option available — a genuinely valuable tier unlock still gets found via whichever
 * branch is currently earning best — without paying that cost on every branch, every step. A real
 * throttle, not a tuning knob to casually change without re-measuring; see
 * ../06-egg-codebase-integration.md for the open question this leaves about whether
 * computeTierMilestoneChain itself should eventually be made cheaper to call repeatedly instead.
 */
const TIER_MACRO_ATTEMPTS_PER_GENERATION = 3;

/** Same throttling idea as TIER_MACRO_ATTEMPTS_PER_GENERATION, applied to the Phase 3 macro — see
 *  its usage site's doc comment for why (measured even more expensive per call, and was previously
 *  unthrottled entirely). */
const PHASE3_MACRO_ATTEMPTS_PER_GENERATION = 3;

export interface RunSearchLoopResult {
  finished: BeamTerminalResult[];
  metrics: {
    statesExpanded: number;
    duplicatesRemoved: number;
    tierMacroCalls: number;
    phase3MacroCalls: number;
    phase3CacheHits: number;
    depthReached: number;
  };
}

export function runSearchLoop(
  initial: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  deadline: number,
  beamWidth: number,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  onProgress?: (progress: BeamSearchProgress) => void
): RunSearchLoopResult {
  const startedAt = Date.now();
  let beam: BeamSearchState[] = [initial];
  const finished: BeamTerminalResult[] = [];
  // Scoped to this one search run — see runPhase3Macro's doc comment (macros.ts) for why that's
  // exactly the right scope (epicResearchLevels/colleggtibleModifiers/rawBackup are fixed for the
  // whole run, so nothing here needs to reason about staleness across runs).
  const phase3ScoreCache: Phase3ScoreCache = new Map();
  const phase3ArtifactFamilyCache: Phase3ArtifactFamilyCache = { families: null };

  let statesExpanded = 0;
  let duplicatesRemoved = 0;
  let tierMacroCalls = 0;
  let phase3MacroCalls = 0;
  let phase3CacheHits = 0;
  let depth = 0;
  let bestScoreSoFar = 0;

  while (beam.length > 0 && depth < maxDepth) {
    // 1. Phase 3 attempts on the current beam's phase-2 members. These are already the previous
    //    generation's deduped-and-pruned survivors (or, on the first iteration, the single trivially
    //    deduped initial state) — see ../03-performance-and-optimization.md's "dedupe before Phase 3"
    //    guidance. Terminal by definition: never re-enters the beam.
    //
    //    Throttled the same way and for the same reason as the tier macro (see
    //    TIER_MACRO_ATTEMPTS_PER_GENERATION's doc comment) — measured directly, runPhase3Macro is
    //    even heavier per call (rankResearchByELRImpact's 'realistic' mode runs a full artifact
    //    optimization per delivery candidate), and unlike the tier macro it was being attempted on
    //    EVERY phase-2 beam member EVERY generation with no throttle at all, which measurably
    //    dominated total runtime once more than a couple of phase-2 states were in the beam
    //    simultaneously.
    //
    //    Caveat worth flagging explicitly: this reuses the same earnings-based rankByEarnings
    //    heuristic as the tier-macro throttle, but earnings and delivery-readiness aren't the same
    //    signal — a state with lower current earnings but more delivery-relevant research already
    //    bought could plausibly score higher on Phase 3 than a higher-earning sibling, and this
    //    throttle could miss it. Flagged as a follow-up rather than solved here: a
    //    delivery-relevance-aware ranking (or a round-robin schedule guaranteeing every phase-2
    //    branch an attempt periodically, not just the earnings leaders) would close this gap.
    const phase3Eligible = new Set(
      rankByEarnings(
        beam.filter(s => s.phase === 2),
        frozen,
        context
      ).slice(0, PHASE3_MACRO_ATTEMPTS_PER_GENERATION)
    );
    for (const state of phase3Eligible) {
      phase3MacroCalls++;
      const cacheSizeBefore = phase3ScoreCache.size;
      const result = runPhase3Macro(
        state,
        frozen,
        context,
        mods,
        deadline,
        phase3ScoreCache,
        phase3ArtifactFamilyCache
      );
      if (result && phase3ScoreCache.size === cacheSizeBefore) phase3CacheHits++;
      if (!result) continue;
      finished.push({ state, edge: result.edge, lastPurchaseTime: result.lastPurchaseTime });
      if (result.edge.finalScore > bestScoreSoFar) bestScoreSoFar = result.edge.finalScore;
    }

    // 2. Generate ordinary successors (purchases, tier macro, phase transition) from every beam
    //    member. Tier macro attempts are throttled to the most promising few — see
    //    TIER_MACRO_ATTEMPTS_PER_GENERATION's doc comment.
    const tierMacroEligible = new Set(
      rankByEarnings(beam, frozen, context).slice(0, TIER_MACRO_ATTEMPTS_PER_GENERATION)
    );

    const successors: BeamSearchState[] = [];
    for (const state of beam) {
      statesExpanded++;
      const absoluteSimTime = absoluteSimTimeOf(state, context);
      const outOfTime = absoluteSimTime >= deadline;

      if (!outOfTime) {
        const candidates = getLightweightPhaseCandidates(state, frozen, context, mods, state.phase);
        for (const candidate of selectCandidates(candidates)) {
          if (absoluteSimTime + candidate.waitSeconds > deadline) continue;
          successors.push(applyResearchPurchase(state, frozen, context, candidate));
        }

        if (nextLockedTier(state) !== null && tierMacroEligible.has(state)) {
          tierMacroCalls++;
          const tierResult = runTierMacro(state, frozen, context, deadline);
          if (tierResult) successors.push(tierResult.nextState);
        }
      }

      // Free and always available in Phase 1, regardless of remaining time — this is what lets a
      // branch that runs out of time mid-Phase-1 still reach a Phase 2 state and get one Phase 3
      // attempt on the next generation, instead of simply vanishing with no recorded outcome.
      if (state.phase === 1) {
        successors.push(phaseTransitionChild(state));
      }
    }

    // 3. Dedupe before the next generation's Phase 3 attempts (step 1 of the next iteration).
    const { survivors, duplicatesRemoved: removedThisGen } = dedupeByEarliestTime(successors);
    duplicatesRemoved += removedThisGen;

    // 4. Rank and keep the best beamWidth.
    beam = rankByEarnings(survivors, frozen, context).slice(0, beamWidth);

    depth++;
    onProgress?.({
      depth,
      beamSize: beam.length,
      statesExpanded,
      duplicatesRemoved,
      tierMacroCalls,
      phase3MacroCalls,
      phase3CacheHits,
      bestScoreSoFar,
      elapsedMs: Date.now() - startedAt,
    });
  }

  return {
    finished,
    metrics: {
      statesExpanded,
      duplicatesRemoved,
      tierMacroCalls,
      phase3MacroCalls,
      phase3CacheHits,
      depthReached: depth,
    },
  };
}
