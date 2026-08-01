import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getTiers, isTierUnlocked } from '../../calculations/commonResearch';
import { meetsROIByDeadline } from '../../calculations/researchROI';
import { rankResearchByROI, buyWhilePassingCheck } from '../../calculations/researchRanking';
import {
  createMilestoneShiftHelpers,
  runTierUnlockMilestone,
  runBuyUntilSaleWarning,
  runBuyUntilSaleDeadline,
} from './helpers/milestones';
import { advanceTimeWithBoundaries } from './helpers/advanceTime';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { shiftCost } from 'lib';
import { isResearchSaleActive, getNextSaleStart, getNextSaleEnd, getBuildPhaseEndForSaleCount } from '@/lib/events';

export interface C3Params {
  /** Attempt to unlock Tier 13 before anything else, if it isn't already unlocked. Default false. */
  attemptTier13Unlock?: boolean;
}

/**
 * C3: the "build phase" shift, spent riding out one or more weekly research sales in Curiosity.
 *
 * Algorithm (see EVENT_AWARE_PLANNING_AND_C3.md Phase 6b for the full derivation):
 * 1. If Tier 13 is wanted, try to unlock it first — return early if it can't be done in time.
 * 2. Buy earnings research until it won't have 70% ROI before the next research sale.
 * 3. Wait for that sale to start.
 * 4. If it's the final sale, buy delivery research until it ends. Otherwise buy earnings research
 *    toward the final sale's 100% ROI deadline (deferring anything that wouldn't also clear 70%
 *    ROI before the *next* sale) and loop back to step 2 for that next sale.
 * 5. Once the final sale has been spent on delivery research, stop.
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

  // Folds a sub-shift's ShiftResult into this shift's own running state — every step below (the
  // tier 13 attempt, and the three "buy until X" helpers) is itself a self-contained mini-shift run
  // against whatever `currentState` is at that point.
  const runStep = (result: ShiftResult) => {
    actions.push(...result.actions);
    currentState = result.endState;
    elapsedSeconds += result.elapsedSeconds;
  };

  // 1. Shift to Curiosity
  const sCost = shiftCost(currentState.soulEggs, currentState.shiftCount);
  const shiftAction = createSimAction(
    'shift',
    {
      fromEgg: currentState.currentEgg,
      toEgg: 'curiosity',
      newShiftCount: currentState.shiftCount + 1,
    },
    sCost
  );
  currentState = applyAction(currentState, shiftAction);
  const shiftSnap = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = shiftSnap;
  shiftAction.totalTimeSeconds = 0;
  actions.push(shiftAction);

  // Step 0 (only when requested): try to unlock Tier 13 before anything else. Must run right here,
  // at elapsedSeconds === 0 — runTierUnlockMilestone derives its absolute-time baseline from
  // currentState.lastStepTime, which trivially still matches startState.lastStepTime at this point
  // (the shift action above doesn't advance time), no need to verify it stays in sync through any
  // intermediate steps.
  if (params.attemptTier13Unlock) {
    const maxTier = Math.max(...getTiers());
    if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
      const timeLimit = Math.max(0, buildPhaseEnd - getAbsTime());
      runStep(runTierUnlockMilestone(currentState, context, maxTier, timeLimit));

      // Tier 13 was requested but the time budget ran out before finishing — this variant is
      // impossible. Return now rather than continuing into steps 2-5 against a state that doesn't
      // have what was asked for; runC3Variants (the runner) recognizes this from the returned state.
      if (!isTierUnlocked(currentState.researchLevels, maxTier)) {
        return { actions, elapsedSeconds, endState: currentState };
      }
    }
  }

  const finalSaleStart = buildPhaseEnd - 86400;

  // Steps 2-5: alternate "buy earnings research toward a sale deadline" / "wait for that sale" /
  // "spend the sale" for each successive weekly research sale until the final one (the one ending
  // at buildPhaseEnd) has been spent on delivery research, then stop.
  while (getAbsTime() < buildPhaseEnd) {
    const absTime = getAbsTime();

    // Already inside the final sale (only possible if C3 starts mid-sale) — spend it directly,
    // same as step 4a below, and we're done either way.
    if (isResearchSaleActive(absTime) && getNextSaleEnd(absTime) >= buildPhaseEnd) {
      runStep(runBuyUntilSaleDeadline(currentState, context, Math.max(0, buildPhaseEnd - absTime)));
      break;
    }

    // 2. Buy earnings research until it won't have 70% ROI before the next research sale.
    runStep(runBuyUntilSaleWarning(currentState, context, Math.max(0, buildPhaseEnd - getAbsTime())));

    // 3. Wait for that sale to start.
    const beforeWait = getAbsTime();
    const saleStart = getNextSaleStart(beforeWait);
    if (saleStart >= buildPhaseEnd) break; // no more sales fit in the build phase
    advanceTime(saleStart - beforeWait);

    // 4. Branch on whether the sale we just reached is the final one.
    const saleEnd = getNextSaleEnd(getAbsTime());
    if (saleEnd >= buildPhaseEnd) {
      // 4a — final sale: buy delivery-impact research until the sale ends, then stop (step 5).
      runStep(runBuyUntilSaleDeadline(currentState, context, Math.max(0, buildPhaseEnd - getAbsTime())));
      break;
    }

    // 4b — not the final sale: buy earnings research toward the final sale's 100% ROI deadline,
    // deferring anything that wouldn't also clear 70% ROI before the *next* sale starts.
    runStep(
      runBuyEarningsTowardFinalSale(currentState, context, finalSaleStart, Math.max(0, buildPhaseEnd - getAbsTime()))
    );
    // 5. Loop back to step 2 for the next sale cycle.
  }

  return { actions, elapsedSeconds, endState: currentState };
}

/**
 * C3 step 4b: earnings research toward the *final* sale's 100% ROI deadline — but skip (defer to a
 * later cycle) any candidate that wouldn't *also* clear 70% ROI before the *next* sale starts, since
 * those are more efficiently bought once a nearer sale discounts them. The 70% check is itself
 * skipped for candidates already landing `duringSale` — nothing to defer, they're already at the
 * discount — same short-circuit `showSaleWarning` uses elsewhere; without it this would be close to
 * a no-op, since 4b only ever runs while the sale it just waited for (step 3) is still active. A
 * composite of two already-built primitives (`meetsROIByDeadline`'s AND, `rankResearchByROI`'s
 * ranking) specific to this shift's loop structure, not promoted to a shared helper — see
 * EVENT_AWARE_PLANNING_AND_C3.md's Phase 6b.
 */
function runBuyEarningsTowardFinalSale(
  startState: EngineState,
  context: SimulationContext,
  finalSaleStart: number,
  timeLimit: number
): ShiftResult {
  const helpers = createMilestoneShiftHelpers(startState, context);

  buyWhilePassingCheck(
    () => {
      const state = helpers.getState();
      const snapshot = computeSnapshot(state, context, { skipGrowth: true });
      const absTime = helpers.getAbsTime();
      const isSale = isResearchSaleActive(absTime);
      const nextSaleStart = getNextSaleStart(absTime);

      const ranked = rankResearchByROI(
        state.researchLevels,
        snapshot,
        context,
        helpers.getModifiers(),
        isSale,
        absTime,
        getNextSaleEnd(absTime),
        'immediate',
        false
      );

      const next = ranked.find(item => {
        if (!item.canBuy || item.earningsDelta === undefined || item.timeToBuySeconds === undefined) return false;
        const purchaseTime = absTime + item.timeToBuySeconds;
        if (!meetsROIByDeadline(item.earningsDelta, item.price, purchaseTime, finalSaleStart, 100)) return false;
        // Already landing at a sale discount — nothing to defer, same short-circuit showSaleWarning
        // uses elsewhere. Only candidates that would miss the *current* sale need the near-term check.
        return item.duringSale || meetsROIByDeadline(item.earningsDelta, item.price, purchaseTime, nextSaleStart, 70);
      });
      return next ? { researchId: next.research.id } : undefined;
    },
    researchId => helpers.buyResearch(researchId, timeLimit)
  );

  return {
    actions: helpers.getActions(),
    elapsedSeconds: helpers.getElapsedSeconds(),
    endState: helpers.getState(),
  };
}

export interface C3Variant {
  saleCount: number;
  attemptTier13Unlock: boolean;
  buildPhaseEnd: number;
  result: ShiftResult;
  // True when attemptTier13Unlock was requested but the returned state still doesn't have it.
  // Computed here, not carried on ShiftResult (see Step 0's comment above).
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
