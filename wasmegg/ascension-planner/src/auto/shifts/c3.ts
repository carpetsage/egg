import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getTiers, isTierUnlocked, type ResearchCostModifiers } from '../../calculations/commonResearch';
import { createMilestoneShiftHelpers, runTierUnlockMilestone } from './helpers/milestones';
import { applyShiftAction } from './helpers/actionHelpers';
import { advanceTimeWithBoundaries } from './helpers/advanceTime';
import { computeSnapshot } from '../../engine/compute';
import { calculateArtifactModifiers } from '../../lib/artifacts';
import { simulateSaleAwareBuy, simulateSaleEndsBuy } from '../../calculations/smartBuyPreview';
import { isResearchSaleActive, getNextSaleStart, getNextSaleEnd, getBuildPhaseEndForSaleCount } from '@/lib/events';

export interface C3Params {
  /** Attempt to unlock Tier 13 before anything else, if it isn't already unlocked. Default false. */
  attemptTier13Unlock?: boolean;
}

/**
 * C3: the "build phase" shift, spent riding out one or more weekly research sales in Curiosity.
 *
 * 1. Shift to Curiosity.
 * 2. If Tier 13 is wanted, try to unlock it first — return early if it can't be done in time.
 *    `runTierUnlockMilestone` is capped at exactly `buildPhaseEnd - getAbsTime()`, so this can only
 *    ever end one of two ways: it unlocks Tier 13 within that budget (leaving `getAbsTime()` at or
 *    before `buildPhaseEnd`, never after), or it doesn't unlock at all — there's no third case where
 *    it "succeeds but finishes late," so a plain `isTierUnlocked` check after the attempt is the
 *    complete impossible/possible test; no separate overrun handling is needed here.
 * 3. Repeat: buy earnings research toward 70% ROI before the next sale, then wait for that sale to
 *    start — until reaching the start of the final sale (the one ending at the build phase's end).
 *    This naturally does fewer cycles (or none) if step 2's Tier 13 unlock already consumed enough
 *    real time to cross earlier sales while buying — the loop just walks forward from wherever
 *    `getAbsTime()` currently is via `getNextSaleStart`/`getNextSaleEnd`, it doesn't count cycles.
 * 4. Buy delivery research until nothing more is worth buying (not necessarily until the sale
 *    itself ends — once purchasing stalls out, C3 stops there rather than padding the clock the
 *    rest of the way to `buildPhaseEnd`; K3, the next shift, already waits out any remaining time
 *    against that same `buildPhaseEnd`, so a second wait here would be redundant).
 *
 * Steps 3-4 both reuse the exact same plan-computation functions the manual planner's "Buy Until
 * Sale Warning"/"Buy Until Sale Ends" buttons are built on — `simulateSaleAwareBuy`/
 * `simulateSaleEndsBuy` in `calculations/smartBuyPreview.ts` — rather than a separate
 * auto-planner-only implementation; see those functions' own doc comments for what each actually
 * does. This replaces the previous design's extra "buy earnings research toward the final sale's
 * 100% deadline" bridging step between sales: `simulateSaleAwareBuy`/`simulateSaleEndsBuy` already
 * handle their own edge cases (sale-bypass purchases, earnings-prelude-before-delivery trimming),
 * so a bespoke C3-only step is no longer needed.
 */
export function runC3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number = 0,
  _reserved?: number,
  params: C3Params = {}
): ShiftResult {
  let currentState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const baseAbsTime = context.ascensionStartTime + context.planStartOffset + (startState.lastStepTime || 0);
  const getAbsTime = () => baseAbsTime + elapsedSeconds;

  const advanceTime = (totalSeconds: number) => {
    const result = advanceTimeWithBoundaries(currentState, actions, elapsedSeconds, context, baseAbsTime, totalSeconds);
    currentState = result.currentState;
    elapsedSeconds = result.elapsedSeconds;
  };

  // Folds a sub-shift's ShiftResult into this shift's own running state.
  const runStep = (result: ShiftResult) => {
    actions.push(...result.actions);
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
  };

  const getModifiers = (): ResearchCostModifiers => {
    const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
    return {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: artifactMods.researchCost.totalMultiplier,
    };
  };

  // Executes a precomputed purchase plan (from `simulateSaleAwareBuy`/`simulateSaleEndsBuy`) for
  // real: buys each research ID, in the order it first appears in the plan, up to its own final
  // target level from `endLevels` — trusting the plan's `endLevels` as the correct outcome (already
  // accounts for anything the plan itself decided to revert, e.g. `simulateSaleAwareBuy`'s
  // sale-bypass cleanup — see its own doc comment) rather than replaying its purchase log
  // entry-for-entry. `timeLimit` bounds this call the same way every other purchase helper here
  // does — the plan was already computed against the same deadline, so this is a safety net against
  // drift between the plan and real execution, not the primary stopping condition.
  const executePlanToLevels = (researchIdsInOrder: string[], targetLevels: Record<string, number>, timeLimit: number) => {
    const buyOrder: string[] = [];
    const seen = new Set<string>();
    for (const id of researchIdsInOrder) {
      if (!seen.has(id)) {
        seen.add(id);
        buyOrder.push(id);
      }
    }

    const helpers = createMilestoneShiftHelpers(currentState, context);
    outer: for (const researchId of buyOrder) {
      const target = targetLevels[researchId] || 0;
      while ((helpers.getState().researchLevels[researchId] || 0) < target) {
        if (!helpers.buyResearch(researchId, timeLimit)) break outer;
      }
    }

    runStep({
      actions: helpers.getActions(),
      elapsedSeconds: helpers.getElapsedSeconds(),
      endState: helpers.getState(),
    });
  };

  // "Buy Until Sale Warning" (70% ROI before `targetDeadline`, the upcoming sale's start) — same
  // plan the manual planner's button executes.
  const buyUntilSaleWarning = (targetDeadline: number) => {
    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const absTime = getAbsTime();
    const plan = simulateSaleAwareBuy(
      currentState.researchLevels,
      snapshot,
      context,
      getModifiers(),
      absTime,
      getNextSaleEnd(absTime),
      targetDeadline,
      'immediate',
      false,
      70
    );
    executePlanToLevels(
      plan.entries.map(e => e.researchId),
      plan.endLevels,
      Math.max(0, targetDeadline - absTime)
    );
  };

  // "Buy Until Sale Ends" (earnings prelude + delivery research through `deadline`) — same plan the
  // manual planner's button executes.
  const buyUntilSaleEnds = (deadline: number) => {
    const snapshot = computeSnapshot(currentState, context, { skipGrowth: true });
    const absTime = getAbsTime();
    const plan = simulateSaleEndsBuy(
      currentState.researchLevels,
      snapshot,
      context,
      getModifiers(),
      absTime,
      deadline,
      'realistic',
      'efficiency',
      context.rawBackup
    );
    executePlanToLevels(plan.researchIds, plan.endLevels, Math.max(0, deadline - absTime));
  };

  // 1. Shift to Curiosity
  const shifted = applyShiftAction(currentState, context, 'curiosity');
  currentState = shifted.state;
  actions.push(shifted.action);

  // 2 (only when requested): try to unlock Tier 13 before anything else. Must run right here, at
  // elapsedSeconds === 0 — runTierUnlockMilestone derives its absolute-time baseline from
  // currentState.lastStepTime, which trivially still matches startState.lastStepTime at this point
  // (the shift action above doesn't advance time).
  if (params.attemptTier13Unlock) {
    const maxTier = Math.max(...getTiers());
    if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
      const timeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
      runStep(runTierUnlockMilestone(currentState, context, maxTier, timeLimit));

      // Tier 13 was requested but the time budget ran out before finishing — this variant is
      // impossible. Return now rather than continuing into the sale-riding steps against a state
      // that doesn't have what was asked for; runC3Variants recognizes this from the returned state.
      // (`runTierUnlockMilestone` is capped at `timeLimit`, so this is the ONLY way this attempt can
      // fail — it can't "succeed but finish after buildPhaseEnd"; see this function's doc comment.)
      if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
        return { actions, elapsedSeconds, endState: currentState };
      }
    }
  }

  // 3-4. Ride out sales until the final one, then spend it on delivery research.
  while (getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();
    const isFinalSale = isResearchSaleActive(absTime) && getNextSaleEnd(absTime) >= buildPhaseEnd;

    if (isFinalSale) {
      // No trailing wait to buildPhaseEnd here: once nothing more is worth buying, there's nothing
      // productive left for C3 to do — the next shift (K3) already waits out any remaining time
      // against this same buildPhaseEnd itself, so padding the clock here would just be redundant.
      buyUntilSaleEnds(buildPhaseEnd);
      break;
    }

    const nextSaleStart = getNextSaleStart(absTime);
    if (nextSaleStart >= buildPhaseEnd) {
      // No more sales start before the deadline (shouldn't normally happen — `buildPhaseEnd` is
      // always an exact sale-end — but kept as a defensive fallback). Spend what's left as a final
      // delivery push; same no-trailing-wait reasoning as the `isFinalSale` branch above.
      buyUntilSaleEnds(buildPhaseEnd);
      break;
    }

    buyUntilSaleWarning(nextSaleStart);
    advanceTime(Math.max(0, nextSaleStart - getAbsTime()));
  }

  return { actions, elapsedSeconds, endState: currentState };
}

export interface C3Variant {
  saleCount: number;
  attemptTier13Unlock: boolean;
  buildPhaseEnd: number;
  result: ShiftResult;
  // True when attemptTier13Unlock was requested but the returned state still doesn't have it.
  impossible: boolean;
}

/**
 * Runs C3 against every combination of `saleCount` (1..maxSaleCount) and, when Tier 13 isn't
 * already unlocked, `attemptTier13Unlock` (false/true) — the candidate set a caller picks the best
 * of by completing each variant through the rest of the ascension and comparing total duration.
 *
 * Walks `saleCount` in descending order so Tier 13 feasibility can be pruned: more time can only
 * make an unlock easier, never harder, so once a larger `saleCount` proves Tier 13 impossible, no
 * smaller `saleCount`'s Tier 13 attempt is even run — those `N-sale-tier13` combos are simply
 * absent from the returned array (not present with `impossible: true`). The non-Tier-13 variant is
 * still always computed for every `saleCount`. Returned in ascending `saleCount` order regardless
 * of the internal descending walk, so callers see a stable, predictable order.
 */
export function runC3Variants(
  startState: EngineState,
  context: SimulationContext,
  maxSaleCount: number = 3
): C3Variant[] {
  const maxTier = Math.max(...getTiers());
  const tier13AlreadyUnlocked = isTierUnlocked(startState.researchLevels, maxTier);
  const variants: C3Variant[] = [];
  let tier13KnownImpossible = false;
  for (let saleCount = maxSaleCount; saleCount >= 1; saleCount--) {
    const buildPhaseEnd = getBuildPhaseEndForSaleCount(context.ascensionStartTime, saleCount);

    variants.push({
      saleCount,
      attemptTier13Unlock: false,
      buildPhaseEnd,
      result: runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: false }),
      impossible: false,
    });

    if (!tier13AlreadyUnlocked && !tier13KnownImpossible) {
      const result = runC3(startState, context, buildPhaseEnd, undefined, { attemptTier13Unlock: true });
      const impossible = !isTierUnlocked(result.endState.researchLevels, maxTier);
      if (impossible) tier13KnownImpossible = true;
      variants.push({ saleCount, attemptTier13Unlock: true, buildPhaseEnd, result, impossible });
    }
  }
  return variants.sort(
    (a, b) => a.saleCount - b.saleCount || Number(a.attemptTier13Unlock) - Number(b.attemptTier13Unlock)
  );
}
