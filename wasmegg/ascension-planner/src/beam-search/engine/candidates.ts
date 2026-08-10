/**
 * Phase 1/2 candidate generation — the beam's ordinary (non-macro) expansion step.
 *
 * Deliberately NOT a call into calculations/researchRanking.ts's rankResearchByROI. That function
 * picks a single best-ranked purchase for a greedy buyer, at a cost of ~120 evaluations per
 * candidate (calculateResearchROI's 60-iteration binary search). The beam needs something
 * different in shape, not just cheaper: a flat, per-candidate-annotated list, since it spawns one
 * child state per viable candidate rather than committing to a rank order. See
 * ../06-egg-codebase-integration.md §4 for the full reasoning and the cost comparison.
 */
import type { ResearchCostModifiers } from '@/calculations/commonResearch';
import { getCommonResearches, isTierUnlocked } from '@/calculations/commonResearch';
import {
  DELIVERY_IMPACT_CATEGORIES,
  ROI_EXCLUDED_CATEGORIES,
  filterByCategories,
} from '@/calculations/researchRanking';
import { isActuallyDuringSale, meetsROIByDeadline, getSaleAwareTimeToSave } from '@/calculations/researchROI';
import { boostTransitionsFrom } from '@/engine/apply';
import { computeSnapshot } from '@/engine/compute';
import type { SimulationContext } from '@/engine/types';
import { getNextPacificTime, isResearchSaleActive } from '@/lib/events';
import {
  absoluteSimTimeOf,
  toEngineState,
  type BeamFrozenContext,
  type BeamPhase,
  type BeamSearchState,
} from './types';

/** Below this fraction of current earnings, a purchase's effect is treated as "no real effect" and
 *  hard-excluded — see the exclusion's own doc comment (below) for why this is relative, not an
 *  absolute-roiSeconds cutoff, and why it's small enough to only ever catch a genuinely-zero
 *  (structurally capped) delta, not a merely-small-but-real one. The confirmed shipping/laying
 *  bottleneck case this exists for produces an earningsDelta of exactly 0 (relative 0), so this
 *  floor has enormous headroom before it would risk excluding anything with real, if modest,
 *  positive impact. */
const NEGLIGIBLE_RELATIVE_EARNINGS_DELTA = 1e-9;

export interface LightweightCandidate {
  researchId: string;
  fromLevel: number;
  toLevel: number;
  price: number;
  waitSeconds: number;
  duringSale: boolean;
  /** Approximate: one extra computeSnapshot call (before vs. after this purchase), not
   *  calculateResearchROI's exact binary-search payback time. Good enough to compare candidates
   *  and prune weak branches; not the number to show in a UI as authoritative. */
  earningsDelta: number;
  /** Clears 70% ROI before the next sale start, or is already landing inside a real sale — the
   *  same rule meetsSaleAwareDeadline (researchROI.ts) encodes for the manual planner's "70%
   *  Return" button, computed per-candidate here instead of gating a single greedy pick. search.ts
   *  decides what to do with this (e.g. de-prioritizing candidates that don't clear it, favoring
   *  waiting for the sale instead) — this function only enumerates and annotates. */
  meets70: boolean;
}

function categoriesOf(r: { categories: string }): string[] {
  return r.categories.split(',').map(c => c.trim());
}

export function getLightweightPhaseCandidates(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  phase: BeamPhase
): LightweightCandidate[] {
  const absoluteSimTime = absoluteSimTimeOf(state, context);
  const isSale = isResearchSaleActive(absoluteSimTime);
  // Same (day=5/Friday, hour=9) convention rankResearchByROI uses for "next sale start".
  const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTime);

  const engineState = toEngineState(state, frozen);
  // skipGrowth: true pins population at full hab capacity rather than modeling growth toward it —
  // the same simplification calculations/milestoneChain.ts's own step-by-step purchase loop already
  // makes (and which the Tier Unlock Macro this engine reuses unchanged inherits). Kept consistent
  // here so the search's cost model doesn't disagree with itself depending on which kind of action
  // it just took.
  const snapshot = computeSnapshot(engineState, context, { skipGrowth: true });
  if (snapshot.offlineEarnings <= 0) return [];

  const transitions = boostTransitionsFrom(snapshot, absoluteSimTime);

  const eligible = getCommonResearches().filter(r => {
    if ((state.researchLevels[r.id] || 0) >= r.levels) return false;
    if (!isTierUnlocked(state.researchLevels, r.tier)) return false;
    // Non-ROI research (hatchery/incubation categories) is permanently excluded from every
    // optimizer in this app, beam search included — see ../06-egg-codebase-integration.md.
    if (!filterByCategories(r, ROI_EXCLUDED_CATEGORIES)) return false;
    // Phase 2 narrows further to delivery-compatible earnings research only.
    if (phase === 2 && !categoriesOf(r).some(c => DELIVERY_IMPACT_CATEGORIES.has(c))) return false;
    return true;
  });

  return eligible.flatMap((r): LightweightCandidate[] => {
    const level = state.researchLevels[r.id] || 0;
    const purchase = getSaleAwareTimeToSave(r, level, mods, isSale, absoluteSimTime, snapshot, transitions);

    const nextSnapshot = computeSnapshot(
      { ...engineState, researchLevels: { ...state.researchLevels, [r.id]: level + 1 } },
      context,
      { skipGrowth: true }
    );
    const earningsDelta = nextSnapshot.offlineEarnings - snapshot.offlineEarnings;

    // Excluded outright — not just deprioritized — only when this purchase has essentially NO
    // effect on earnings at all, not merely a slow payback at today's earnings rate. A RELATIVE
    // floor against current earnings, not an absolute roiSeconds-vs-calendar-time cutoff.
    //
    // An earlier version of this exclusion used exactly that absolute cutoff (roiSeconds =
    // price/earningsDelta compared against MAX_ROI_PAYBACK_SEARCH_SECONDS, the same 999-day
    // convention researchROI.ts/researchRanking.ts's "real" ROI ranking uses) — found, via a real
    // beam-search run and confirmed by direct testing, to wrongly exclude Multiversal Layering
    // level 2 (10x earnings, one of the best purchases available at this game stage): evaluated
    // early in a long ascension against a realistic fixture, its earningsDelta was a full ~9x of
    // current earnings (nowhere near negligible) — but its price is so large that roiSeconds,
    // computed against the still-small CURRENT earnings rate, came out to ~387 million days. That
    // absolute-time framing implicitly assumes earnings stay flat forever, which is never true this
    // late into a run — the whole reason a purchase like this is worth buying early is that its
    // multiplier compounds over however much of the ascension remains, growing the earnings base
    // the "flat rate" projection can't see.
    //
    // The shipping/laying "partner bottleneck" case this exclusion actually exists for (found by
    // directly diffing a beam-search trace against a real manual plan, see ../HANDOFF.md) has a
    // categorically different signature: buying more shipping-capacity research while laying rate
    // is the actual constraint (or vice versa) produces an earningsDelta of EXACTLY zero — confirmed
    // directly, not approximately small — because effectiveLayRate.ts caps earnings at
    // min(layRate, shippingCapacity), so the increased side literally doesn't move anything. A
    // relative-to-current-earnings floor still catches that case (0 / anything = 0, always at the
    // floor) without collateral-damaging genuinely high-value research that merely has a big price
    // tag. "Positive impact but slow given the time actually remaining" is a different, separately
    // handled concern — meets70/fastForwardToSale (search.ts) already deprioritize or wait out that
    // case; this exclusion is only for purchases with no real effect at all.
    //
    // Uses this function's existing lightweight price/earningsDelta approximation (not
    // calculateResearchROI's exact compounding binary search) — consistent with the rest of this
    // function's cost/precision tradeoff, and sufficient to catch the case this exists for.
    const relativeEarningsDelta = earningsDelta / snapshot.offlineEarnings;
    if (relativeEarningsDelta <= NEGLIGIBLE_RELATIVE_EARNINGS_DELTA) return [];

    const completesAt = absoluteSimTime + purchase.waitSeconds;
    const meets70 =
      isActuallyDuringSale(purchase.duringSale, completesAt) ||
      meetsROIByDeadline(earningsDelta, purchase.price, completesAt, nextSaleStart, 70);

    return [
      {
        researchId: r.id,
        fromLevel: level,
        toLevel: level + 1,
        price: purchase.price,
        waitSeconds: purchase.waitSeconds,
        duringSale: purchase.duringSale,
        earningsDelta,
        meets70,
      },
    ];
  });
}
