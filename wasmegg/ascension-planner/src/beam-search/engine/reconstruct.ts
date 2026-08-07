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
 */
import type { ResearchLevels } from '@/types';
import type { SimulationContext } from '@/engine/types';
import { absoluteSimTimeOf, type BeamSearchState, type BeamTerminalResult } from './types';

export interface ReconstructedPlan {
  researchIds: string[];
  endLevels: ResearchLevels;
  score: number;
  lastPurchaseTime: number;
  /** Absolute unix seconds the plan switched from Phase 1 to Phase 2, or null if it never did
   *  (e.g. it started in Phase 2 already, or the run never found a viable transition). */
  phaseTransitionTime: number | null;
  tierUnlockTimes: { tier: number; time: number }[];
}

export function reconstructPlan(result: BeamTerminalResult, context: SimulationContext): ReconstructedPlan {
  const chain: BeamSearchState[] = [];
  for (let cur: BeamSearchState | null = result.state; cur; cur = cur.parent) {
    chain.push(cur);
  }
  chain.reverse(); // chain[0] is the initial state (purchase === null)

  const researchIds: string[] = [];
  let phaseTransitionTime: number | null = null;
  const tierUnlockTimes: { tier: number; time: number }[] = [];

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
  };
}
