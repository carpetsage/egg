/**
 * Public entry point for the beam search research-purchase optimizer.
 *
 * `runBeamSearch` is intentionally the ONLY export a caller needs: it takes a real EngineState +
 * SimulationContext (exactly what auto/shifts/c3.ts and the manual planner already work with) plus
 * a deadline and beam width, and returns a flat purchase plan. Nothing Pinia- or component-specific
 * — see ../06-egg-codebase-integration.md §6 for why that's the point: the same function is meant
 * to be callable from a Web Worker (this pass) and, later, from auto/shifts/c3.ts unchanged.
 */
import { calculateArtifactModifiers } from '@/lib/artifacts';
import type { EngineState, SimulationContext } from '@/engine/types';
import type { BeamSearchOptions, BeamSearchResult, BeamTerminalResult } from './types';
import { splitEngineState } from './types';
import { reconstructPlan } from './reconstruct';
import { PHASE3_MACRO_ATTEMPTS_PER_GENERATION, runSearchLoop } from './search';

export type {
  BeamSearchOptions,
  BeamSearchProgress,
  BeamSearchResult,
  // Diagnostics types (../HANDOFF.md's tooling options #1/#2) — BeamSearchProgress above already
  // covers #1 (the new cumulative counters live right on it); these four are #2's export shape.
  WinningPathTrace,
  WinningPathStepTrace,
  FinalStepTrace,
  BeamMemberSummary,
} from './types';

// Re-exported so the UI (BeamSearchView.vue) can seed its Phase 3 Attempts input with the engine's
// own default rather than duplicating the number.
export { PHASE3_MACRO_ATTEMPTS_PER_GENERATION } from './search';

function pickWinner(finished: BeamTerminalResult[]): BeamTerminalResult {
  // Primary: maximize finalScore. Secondary: minimize lastPurchaseTime. Per
  // ../02-algorithm-specification.md's "Scoring" section.
  return finished.reduce((best, candidate) => {
    if (candidate.edge.finalScore !== best.edge.finalScore) {
      return candidate.edge.finalScore > best.edge.finalScore ? candidate : best;
    }
    return candidate.lastPurchaseTime < best.lastPurchaseTime ? candidate : best;
  });
}

export function runBeamSearch(
  startState: EngineState,
  context: SimulationContext,
  options: BeamSearchOptions
): BeamSearchResult {
  if (!context.rawBackup) {
    // The Phase 3 macro's scoring (computeRealisticELR via getOptimalELRSet) requires it — same
    // precondition the manual planner's "realistic" Delivery Impact view already has. Failing fast
    // here, before any search work happens, is more useful than a confusing empty result later.
    throw new Error('runBeamSearch requires context.rawBackup (needed to score the final delivery rate).');
  }

  const startedAt = Date.now();
  const { frozen, initial } = splitEngineState(startState);
  const mods = {
    labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
    researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
    puzzleCubeMultiplier: calculateArtifactModifiers(frozen.artifactLoadout).researchCost.totalMultiplier,
  };

  const phase3AttemptsPerGeneration = options.phase3AttemptsPerGeneration ?? PHASE3_MACRO_ATTEMPTS_PER_GENERATION;

  const { finished, metrics, generationTraces } = runSearchLoop(
    initial,
    frozen,
    context,
    mods,
    options.deadline,
    options.beamWidth,
    options.maxDepth,
    options.onProgress,
    options.isCancelled,
    options.trace,
    phase3AttemptsPerGeneration
  );

  if (finished.length === 0) {
    // Same message whether this is a genuine "no plan reachable" outcome or an early cancellation
    // that happened before any Phase 3 terminal was found — metrics.cancelled (were it reachable
    // here) would disambiguate, but there's no result object to carry it on this branch. The Web
    // Worker wrapper (src/workers/beamSearch.worker.ts) already knows independently whether *it*
    // requested cancellation for this run, so it doesn't need this error's text to tell the two
    // apart — it reports 'cancelled' instead of 'error' in that case regardless of this message.
    throw new Error(
      'Beam search found no plan that reaches a Phase 3 delivery evaluation before the deadline. ' +
        'Try a later deadline or a wider beam width.'
    );
  }

  const winner = pickWinner(finished);
  const plan = reconstructPlan(winner, context, generationTraces ? { finished, generationTraces } : undefined);

  return {
    score: plan.score,
    researchIds: plan.researchIds,
    endLevels: plan.endLevels,
    lastPurchaseTime: plan.lastPurchaseTime,
    phaseTransitionTime: plan.phaseTransitionTime,
    tierUnlockTimes: plan.tierUnlockTimes,
    saleWaitTimes: plan.saleWaitTimes,
    metrics: {
      runtimeMs: Date.now() - startedAt,
      statesExpanded: metrics.statesExpanded,
      duplicatesRemoved: metrics.duplicatesRemoved,
      tierMacroCalls: metrics.tierMacroCalls,
      phase3MacroCalls: metrics.phase3MacroCalls,
      phase3CacheHits: metrics.phase3CacheHits,
      beamWidth: options.beamWidth,
      phase3AttemptsPerGeneration,
      cancelled: metrics.cancelled,
    },
    trace: plan.trace,
  };
}
