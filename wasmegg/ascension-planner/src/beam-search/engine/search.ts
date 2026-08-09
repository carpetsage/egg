/**
 * The outer beam loop — see ../02-algorithm-specification.md for the game-agnostic spec this
 * follows, and ../06-egg-codebase-integration.md for how each piece maps onto this codebase.
 */
import type { ResearchCostModifiers } from '@/calculations/commonResearch';
import { applyAction, applyTime, boostTransitionsFrom } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import type { SimulationContext } from '@/engine/types';
import { createSimAction } from '@/types/actions/meta';
import { getNextPacificTime, isEarningsBoostActive } from '@/lib/events';
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
 * ../06-egg-codebase-integration.md §4. This is the main lever keeping the branching factor near
 * Part 3's assumed ~10 rather than the full unfiltered candidate count.
 *
 * Does NOT fall back to the unfiltered candidate list when nothing clears the bar (an earlier
 * version did) — found, by directly diffing a real exported trace against a real manual plan (see
 * ../HANDOFF.md), that this let the search settle for a weak purchase during a lean stretch instead
 * of doing what a human naturally would: wait for the sale. `runSearchLoop`'s caller now checks for
 * this exact "candidates existed, none were good enough" case and generates a `fastForwardToSale`
 * successor instead — see there.
 */
// Exported for the exhaustive-search oracle (oracle/beam-oracle.spec.ts), which needs the exact
// same candidate-selection rule the beam itself uses — the oracle validates the beam's own
// width/throttle limits against an unlimited version of this same algorithm, not a different one.
export function selectCandidates(candidates: LightweightCandidate[]): LightweightCandidate[] {
  return candidates.filter(c => c.meets70);
}

/**
 * "Nothing worth buying right now — skip straight to the next research sale", taken whenever
 * `selectCandidates` comes back empty despite there being real (if currently poor-ROI) candidates —
 * see its own doc comment for why this replaces the old "just buy something anyway" fallback.
 * Mirrors the manual planner's own "Wait for Research Sale" wait action (ResearchActions.vue's
 * insertEventCrossingWaits / lib/actions/executors/waitForResearchSale.ts): a pure time-advance, no
 * purchase, that correctly accrues gems throughout (including across a 2x earnings boost window
 * that starts or ends during the wait — `boostTransitionsFrom`'s transitions list is what makes
 * `applyTime`'s earnings calc piecewise-correct across that boundary, exactly like
 * `applyResearchPurchase`'s own wait already relies on for its own, usually shorter, waits) and then
 * lands with `activeSales.research` correctly flipped on.
 *
 * Unlike `applyResearchPurchase` and `phaseTransitionChild`, this one has to set `activeSales`/
 * `earningsBoost` explicitly rather than just carrying the pre-wait state forward: neither field is
 * auto-derived from the clock anywhere in this codebase (see engine/apply/actions.ts's `toggle_sale`/
 * `toggle_earnings_boost` handlers — both are the only things that ever change these fields), so a
 * multi-day wait needs its arrival-time sale/boost status computed explicitly, not inherited from
 * whatever was true when the wait started.
 */
export function fastForwardToSale(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  nextSaleStart: number
): BeamSearchState {
  const engineState = toEngineState(state, frozen);
  const snapshot = computeSnapshot(engineState, context, { skipGrowth: true });
  const absoluteSimTime = absoluteSimTimeOf(state, context);
  const waitSeconds = nextSaleStart - absoluteSimTime;
  const nextEngineState = applyTime(engineState, waitSeconds, snapshot, {
    transitions: boostTransitionsFrom(snapshot, absoluteSimTime),
  });
  const nextSnapshot = computeSnapshot(nextEngineState, context, { skipGrowth: true });
  // Same literal 2x ResearchActions.vue's own insertToggleEarningsBoost hardcodes for a real
  // toggle_earnings_boost action's payload — not importing engine/apply/math.ts's private
  // EARNINGS_BOOST_MULTIPLIER constant for one read, matching that existing precedent instead.
  const boostActiveAtArrival = isEarningsBoostActive(nextSaleStart);

  return {
    parent: state,
    purchase: { kind: 'waitForSale' },
    phase: state.phase,
    researchLevels: nextEngineState.researchLevels,
    bankValue: nextSnapshot.bankValue,
    population: nextSnapshot.population,
    lastStepTime: nextEngineState.lastStepTime,
    eggsDelivered: nextEngineState.eggsDelivered,
    fuelTankAmounts: nextEngineState.fuelTankAmounts,
    teEarned: nextEngineState.teEarned,
    activeSales: { ...nextEngineState.activeSales, research: true },
    earningsBoost: boostActiveAtArrival ? { active: true, multiplier: 2 } : { active: false, multiplier: 1 },
  };
}

/** A state paired with the earnings value `rankByEarnings` computed for it — kept together (rather
 *  than each caller recomputing earnings again when it needs the number, not just the ordering) so
 *  the trace-capture path below (see `trace` in runSearchLoop) can reuse this same computation
 *  instead of calling computeSnapshot a second time purely for diagnostics. */
export interface RankedState {
  state: BeamSearchState;
  earnings: number;
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
 * Used for three purposes: trimming deduped successors down to beamWidth, picking which current beam
 * members are worth an expensive tier-macro attempt this generation (see
 * TIER_MACRO_ATTEMPTS_PER_GENERATION below), and — when `BeamSearchOptions.trace` is set — capturing
 * this same earnings-ranked ordering as that generation's beam snapshot for the winning-path trace
 * (see WinningPathTrace's doc comment in types.ts). Returns the computed earnings alongside each
 * state (not just the reordered states) specifically so that last use doesn't need to recompute them.
 */
function rankByEarnings(
  states: BeamSearchState[],
  frozen: BeamFrozenContext,
  context: SimulationContext
): RankedState[] {
  const withEarnings = states.map(state => ({
    state,
    earnings: computeSnapshot(toEngineState(state, frozen), context, { skipGrowth: true }).offlineEarnings,
  }));
  withEarnings.sort((a, b) => {
    if (a.earnings !== b.earnings) return b.earnings - a.earnings;
    return a.state.lastStepTime - b.state.lastStepTime;
  });
  return withEarnings;
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
    cancelled: boolean;
  };
  /** Present only when `trace` was true — see WinningPathTrace's doc comment (types.ts) for the
   *  output this feeds and TRACE_ALTERNATIVES_LIMIT's doc comment (reconstruct.ts) for how it gets
   *  turned into that bounded output. Keyed by generation number, matching BeamSearchProgress.depth's
   *  numbering — `generationTraces.get(N)` is exactly this generation's beam (post-trim,
   *  earnings-ranked, same array `beam` itself held after step 4 below), for every N from 1 up to
   *  however far the search got. Retained for the whole run rather than discarded each generation —
   *  the real, opt-in memory cost `BeamSearchOptions.trace`'s own doc comment describes. */
  generationTraces?: Map<number, RankedState[]>;
}

export function runSearchLoop(
  initial: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  deadline: number,
  beamWidth: number,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  onProgress?: (progress: BeamSearchProgress) => void,
  // Checked once at the top of every generation (see BeamSearchOptions.isCancelled's doc comment
  // for why "between generations" is the right granularity) — Phase B's Web Worker wrapper is the
  // real caller; passed all the way down here (rather than only checked in index.ts around the
  // whole call) so a long search actually stops early instead of running to its natural completion
  // after a Cancel click.
  isCancelled?: () => boolean,
  // See BeamSearchOptions.trace's doc comment (types.ts) for what this turns on and why it's opt-in.
  trace = false
): RunSearchLoopResult {
  const startedAt = Date.now();
  let beam: BeamSearchState[] = [initial];
  const finished: BeamTerminalResult[] = [];
  let cancelled = false;
  // Scoped to this one search run — see runPhase3Macro's doc comment (macros.ts) for why that's
  // exactly the right scope (epicResearchLevels/colleggtibleModifiers/rawBackup are fixed for the
  // whole run, so nothing here needs to reason about staleness across runs).
  const phase3ScoreCache: Phase3ScoreCache = new Map();
  const phase3ArtifactFamilyCache: Phase3ArtifactFamilyCache = { families: null };
  const generationTraces: Map<number, RankedState[]> | undefined = trace ? new Map() : undefined;

  let statesExpanded = 0;
  let duplicatesRemoved = 0;
  let tierMacroCalls = 0;
  let tierMacroSuccesses = 0;
  let phase3MacroCalls = 0;
  let phase3MacroSuccesses = 0;
  let phase3CacheHits = 0;
  let candidatesGenerated = 0;
  let depth = 0;
  let bestScoreSoFar = 0;

  while (beam.length > 0 && depth < maxDepth) {
    if (isCancelled?.()) {
      cancelled = true;
      break;
    }

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
      )
        .slice(0, PHASE3_MACRO_ATTEMPTS_PER_GENERATION)
        .map(ranked => ranked.state)
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
      phase3MacroSuccesses++;
      finished.push({ state, edge: result.edge, lastPurchaseTime: result.lastPurchaseTime });
      if (result.edge.finalScore > bestScoreSoFar) bestScoreSoFar = result.edge.finalScore;
    }

    // 2. Generate ordinary successors (purchases, tier macro, phase transition) from every beam
    //    member. Tier macro attempts are throttled to the most promising few — see
    //    TIER_MACRO_ATTEMPTS_PER_GENERATION's doc comment.
    const tierMacroEligible = new Set(
      rankByEarnings(beam, frozen, context)
        .slice(0, TIER_MACRO_ATTEMPTS_PER_GENERATION)
        .map(ranked => ranked.state)
    );

    const successors: BeamSearchState[] = [];
    for (const state of beam) {
      statesExpanded++;
      const absoluteSimTime = absoluteSimTimeOf(state, context);
      const outOfTime = absoluteSimTime >= deadline;

      if (!outOfTime) {
        const candidates = getLightweightPhaseCandidates(state, frozen, context, mods, state.phase);
        const selected = selectCandidates(candidates);
        if (selected.length > 0) {
          for (const candidate of selected) {
            if (absoluteSimTime + candidate.waitSeconds > deadline) continue;
            successors.push(applyResearchPurchase(state, frozen, context, candidate));
          }
        } else if (candidates.length > 0) {
          // Real candidates existed, none cleared 70% — wait for the discount instead of settling.
          // See selectCandidates' and fastForwardToSale's own doc comments.
          const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTime);
          if (nextSaleStart <= deadline) {
            successors.push(fastForwardToSale(state, frozen, context, nextSaleStart));
          }
        }

        if (nextLockedTier(state) !== null && tierMacroEligible.has(state)) {
          tierMacroCalls++;
          const tierResult = runTierMacro(state, frozen, context, deadline);
          if (tierResult) {
            tierMacroSuccesses++;
            successors.push(tierResult.nextState);
          }
        }
      }

      // Free and always available in Phase 1, regardless of remaining time — this is what lets a
      // branch that runs out of time mid-Phase-1 still reach a Phase 2 state and get one Phase 3
      // attempt on the next generation, instead of simply vanishing with no recorded outcome.
      if (state.phase === 1) {
        successors.push(phaseTransitionChild(state));
      }
    }
    candidatesGenerated += successors.length;

    // 3. Dedupe before the next generation's Phase 3 attempts (step 1 of the next iteration).
    const { survivors, duplicatesRemoved: removedThisGen } = dedupeByEarliestTime(successors);
    duplicatesRemoved += removedThisGen;

    // 4. Rank and keep the best beamWidth.
    const rankedBeam = rankByEarnings(survivors, frozen, context).slice(0, beamWidth);
    beam = rankedBeam.map(ranked => ranked.state);

    depth++;
    generationTraces?.set(depth, rankedBeam);
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
      candidatesGenerated,
      tierMacroSuccesses,
      phase3MacroSuccesses,
      finishedCount: finished.length,
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
      cancelled,
    },
    generationTraces,
  };
}
