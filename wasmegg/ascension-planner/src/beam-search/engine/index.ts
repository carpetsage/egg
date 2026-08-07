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
import { runSearchLoop } from './search';

export type { BeamSearchOptions, BeamSearchProgress, BeamSearchResult } from './types';

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

  const { finished, metrics } = runSearchLoop(
    initial,
    frozen,
    context,
    mods,
    options.deadline,
    options.beamWidth,
    options.maxDepth,
    options.onProgress
  );

  if (finished.length === 0) {
    throw new Error(
      'Beam search found no plan that reaches a Phase 3 delivery evaluation before the deadline. ' +
        'Try a later deadline or a wider beam width.'
    );
  }

  const winner = pickWinner(finished);
  const plan = reconstructPlan(winner, context);

  return {
    score: plan.score,
    researchIds: plan.researchIds,
    endLevels: plan.endLevels,
    lastPurchaseTime: plan.lastPurchaseTime,
    phaseTransitionTime: plan.phaseTransitionTime,
    tierUnlockTimes: plan.tierUnlockTimes,
    metrics: {
      runtimeMs: Date.now() - startedAt,
      statesExpanded: metrics.statesExpanded,
      duplicatesRemoved: metrics.duplicatesRemoved,
      tierMacroCalls: metrics.tierMacroCalls,
      phase3MacroCalls: metrics.phase3MacroCalls,
      phase3CacheHits: metrics.phase3CacheHits,
      beamWidth: options.beamWidth,
    },
  };
}
