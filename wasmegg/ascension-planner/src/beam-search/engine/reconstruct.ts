/**
 * Flattens a winning BeamTerminalResult into one ordered purchase sequence, per
 * ../02-algorithm-specification.md's "Purchase History" section and
 * ../06-egg-codebase-integration.md §3/§7. Walks parent pointers back to the root and reverses,
 * expanding every tier-macro edge into its own already-ordered sub-sequence inline — no separate
 * "explode the macro" pass needed, since each macro edge already carries its sub-sequence (see
 * TierMacroEdge/Phase3MacroEdge in ./types.ts).
 *
 * Output shape matches SimpleBuyPlan (calculations/smartBuyPreview.ts): a flat, possibly-repeating
 * researchIds list plus final levels — the same shape the existing "replay against the live plan"
 * adapters (auto/shifts/c3.ts's executePlanToLevels, ResearchActions.vue's buy flow) already
 * consume, so Apply needs no new replay logic.
 *
 * Also builds the optional winning-path trace (../HANDOFF.md's tooling option #2) when the caller
 * supplies `generationTraces` — see WinningPathTrace's own doc comment (types.ts) for what it
 * contains and why it stays bounded regardless of beamWidth/run length.
 */
import type { ResearchLevels } from '@/types';
import type { SimulationContext } from '@/engine/types';
import type { RankedState } from './search';
import {
  absoluteSimTimeOf,
  type BeamMemberSummary,
  type BeamSearchState,
  type BeamTerminalResult,
  type WinningPathTrace,
  type WinningPathStepTrace,
} from './types';

export interface ReconstructedPlan {
  researchIds: string[];
  endLevels: ResearchLevels;
  score: number;
  lastPurchaseTime: number;
  /** Absolute unix seconds the plan switched from Phase 1 to Phase 2, or null if it never did
   *  (e.g. it started in Phase 2 already, or the run never found a viable transition). */
  phaseTransitionTime: number | null;
  tierUnlockTimes: { tier: number; time: number }[];
  /** See BeamSearchResult.saleWaitTimes' own doc comment (types.ts). */
  saleWaitTimes: number[];
  /** Present only when `generationTraces` was passed to reconstructPlan. */
  trace?: WinningPathTrace;
}

/** How many other beam members / finished attempts to show per trace step — deliberately small and
 *  fixed (not tied to beamWidth) so the export can't turn into the "overwhelming swarm of logs" this
 *  tooling exists to avoid, no matter how wide the search was run. `chosenRank`/
 *  `beamSizeThisGeneration`/`totalPhase3AttemptsFound` still report the true, uncapped numbers
 *  alongside this capped list, so nothing about scale is actually hidden — just the long tail. */
const TRACE_ALTERNATIVES_LIMIT = 5;

function toBeamMemberSummary(ranked: RankedState, context: SimulationContext): BeamMemberSummary {
  return {
    // Non-null for every entry a generation snapshot can ever contain — the only state with a null
    // purchase is the untouched initial one, which search.ts never captures (nothing to compare it
    // against pre-generation-1). See BeamMemberSummary's own doc comment.
    purchase: ranked.state.purchase!,
    phase: ranked.state.phase,
    earnings: ranked.earnings,
    absoluteSimTime: absoluteSimTimeOf(ranked.state, context),
  };
}

/**
 * Walks the same parent chain reconstructPlan already walks, cross-referencing each of the winning
 * path's own states against that generation's captured beam (by reference — these are the same live
 * `BeamSearchState` objects, not copies, since a state that continues into the winning path is by
 * definition one of the members `runSearchLoop` kept in the beam that generation) to find its rank
 * and its generation's top alternatives. The final step (the Phase 3 macro that actually finished the
 * plan) is handled separately from the rest — see FinalStepTrace's own doc comment for why
 * "alternatives" means something different there (other complete plans, not sibling beam members).
 */
function buildWinningPathTrace(
  chain: BeamSearchState[],
  winner: BeamTerminalResult,
  finished: BeamTerminalResult[],
  generationTraces: Map<number, RankedState[]>,
  context: SimulationContext
): WinningPathTrace {
  const steps: WinningPathStepTrace[] = [];

  for (let i = 1; i < chain.length; i++) {
    const state = chain[i];
    const generationBeam = generationTraces.get(i);
    // Shouldn't happen in practice — every state on the winning path was, by construction, part of
    // the beam runSearchLoop captured for its own generation — but skipped defensively rather than
    // thrown on, since a missing/mismatched trace step is a diagnostics gap, not a reason to fail the
    // whole search result.
    if (!generationBeam) continue;
    const chosenIndex = generationBeam.findIndex(ranked => ranked.state === state);
    if (chosenIndex === -1) continue;

    const alternatives = generationBeam
      .filter((_, index) => index !== chosenIndex)
      .slice(0, TRACE_ALTERNATIVES_LIMIT)
      .map(ranked => toBeamMemberSummary(ranked, context));

    steps.push({
      depth: i,
      chosen: toBeamMemberSummary(generationBeam[chosenIndex], context),
      alternatives,
      chosenRank: chosenIndex + 1,
      beamSizeThisGeneration: generationBeam.length,
    });
  }

  // Same comparator engine/index.ts's pickWinner itself uses (score desc, then earliest
  // lastPurchaseTime) — not just score desc. Found by direct inspection of a real exported trace:
  // score-only sorting left `winnerRank` reporting things like 11 even though `winner` genuinely was
  // pickWinner's own selection, because many attempts shared the exact same finalScore (a real,
  // common occurrence — see ../HANDOFF.md's convergence notes on the score plateauing) and only the
  // lastPurchaseTime tiebreak actually distinguishes them. Array.prototype.sort's stability (ES2019+)
  // means this reproduces pickWinner's "earliest of a full tie wins" behavior exactly, so
  // `sortedFinished[0]` is always the same object as `winner` — winnerRank is always 1 by
  // construction, kept as an explicit consistency check rather than removed (see its doc comment).
  const sortedFinished = [...finished].sort((a, b) => {
    if (a.edge.finalScore !== b.edge.finalScore) return b.edge.finalScore - a.edge.finalScore;
    return a.lastPurchaseTime - b.lastPurchaseTime;
  });
  const winnerRank = sortedFinished.indexOf(winner) + 1;
  const otherAttempts = sortedFinished
    .filter(attempt => attempt !== winner)
    .slice(0, TRACE_ALTERNATIVES_LIMIT)
    .map(attempt => ({ finalScore: attempt.edge.finalScore, lastPurchaseTime: attempt.lastPurchaseTime }));

  return {
    steps,
    finalStep: {
      finalScore: winner.edge.finalScore,
      totalPhase3AttemptsFound: finished.length,
      winnerRank,
      otherAttempts,
    },
  };
}

export function reconstructPlan(
  result: BeamTerminalResult,
  context: SimulationContext,
  // Both required together to build `trace` — passed by engine/index.ts only when
  // BeamSearchOptions.trace was set; see RunSearchLoopResult.generationTraces's own doc comment for
  // where these come from. Omitted (or generationTraces undefined) means no trace is built at all,
  // not an empty one — reconstructPlan's core flattening job (below) doesn't need either of them.
  traceInputs?: { finished: BeamTerminalResult[]; generationTraces: Map<number, RankedState[]> }
): ReconstructedPlan {
  const chain: BeamSearchState[] = [];
  for (let cur: BeamSearchState | null = result.state; cur; cur = cur.parent) {
    chain.push(cur);
  }
  chain.reverse(); // chain[0] is the initial state (purchase === null)

  const researchIds: string[] = [];
  let phaseTransitionTime: number | null = null;
  const tierUnlockTimes: { tier: number; time: number }[] = [];
  const saleWaitTimes: number[] = [];

  for (let i = 1; i < chain.length; i++) {
    const state = chain[i];
    const edge = state.purchase;
    if (!edge) continue; // unreachable in practice (only chain[0] has purchase === null), guards the type

    switch (edge.kind) {
      case 'research':
        researchIds.push(edge.researchId);
        break;
      case 'tierMacro':
        researchIds.push(...edge.researchIds);
        tierUnlockTimes.push({ tier: edge.tier, time: absoluteSimTimeOf(state, context) });
        break;
      case 'phaseTransition':
        phaseTransitionTime = absoluteSimTimeOf(state, context);
        break;
      case 'waitForSale':
        // No purchase — nothing to add to researchIds, same as phaseTransition above. Recorded here
        // (arrival time, i.e. the sale's own start) purely for visibility into how often the search
        // decided nothing was worth buying immediately; see WaitForSaleEdge's own doc comment.
        saleWaitTimes.push(absoluteSimTimeOf(state, context));
        break;
      case 'phase3Macro':
        // Never appears mid-chain: Phase 3 is terminal, so a phase3Macro edge only ever shows up
        // as `result.edge`, appended below, not as a state's own `purchase` inside the parent walk.
        break;
    }
  }

  // Phase 3's own purchases, appended last.
  researchIds.push(...result.edge.researchIds);

  return {
    researchIds,
    endLevels: result.edge.finalLevels,
    score: result.edge.finalScore,
    lastPurchaseTime: result.lastPurchaseTime,
    phaseTransitionTime,
    tierUnlockTimes,
    saleWaitTimes,
    trace: traceInputs
      ? buildWinningPathTrace(chain, result, traceInputs.finished, traceInputs.generationTraces, context)
      : undefined,
  };
}
