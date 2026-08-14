/**
 * Boundary-aware time advancement shared by C1 and C3.
 *
 * Unlike the simpler flat-wait `advanceTime` every other shift file uses (see AGENT.md's
 * "advanceTime must manually credit bankValue" gotcha), this version steps up to the next
 * research-sale / earnings-boost boundary at a time rather than jumping the full requested
 * duration at once — emitting `wait_for_research_sale`/`wait_for_earnings_boost` actions when a
 * step lands exactly on one, and `toggle_sale`/`toggle_earnings_boost` actions right after. C1
 * and C3 both need this because their waits (tier-unlock chains, ELR sweeps) can plausibly cross
 * a weekly sale/boost boundary, silently mis-pricing purchases made after it if skipped.
 *
 * Mutates `actions` in place (same convention as quickWins.ts); `currentState`/`elapsedSeconds`
 * are reassigned references, so they're threaded through as explicit params/return values rather
 * than mutated in place.
 */

import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import type { EngineState, SimulationContext } from '../../types';
import { computeSnapshot } from '../../../engine/compute';
import { applyAction, calculateEggsDeliveredForTime } from '../../../engine/apply';
import {
  isResearchSaleActive,
  getNextSaleStart,
  getNextSaleEnd,
  isEarningsBoostActive,
  getNextEarningsBoostEnd,
  getNextEarningsBoostStart,
} from '@/lib/events';

export interface AdvanceTimeResult {
  currentState: EngineState;
  elapsedSeconds: number;
}

/**
 * Flat-rate time advancement — no boundary stepping, just jump the full requested duration
 * and credit `bankValue`/`eggsDelivered` at the current earnings rate for its length. Use
 * `advanceTimeWithBoundaries` instead for shifts whose waits could plausibly cross a weekly
 * sale/earnings-boost boundary (see that function's doc comment for why).
 *
 * Same calling convention as `advanceTimeWithBoundaries`: `elapsedSeconds` is the cumulative
 * total so far, and the returned `elapsedSeconds` is the new cumulative total (not a delta).
 *
 * @param metadata  Extra fields merged into the `wait_for_time` action's payload. Omit for the
 *                  common case.
 */
export function advanceTimeFlat(
  currentState: EngineState,
  actions: Action[],
  elapsedSeconds: number,
  context: SimulationContext,
  seconds: number,
  metadata?: Record<string, unknown>
): AdvanceTimeResult {
  if (seconds <= 0) return { currentState, elapsedSeconds };

  const snap = computeSnapshot(currentState, context, { skipGrowth: true });
  const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: seconds, ...metadata });
  const passiveEggs = calculateEggsDeliveredForTime(seconds, snap);

  let newState = applyAction(currentState, waitAction);
  newState = {
    ...newState,
    lastStepTime: (newState.lastStepTime || 0) + seconds,
    bankValue: (newState.bankValue || 0) + snap.offlineEarnings * seconds,
    eggsDelivered: {
      ...newState.eggsDelivered,
      [newState.currentEgg]: (newState.eggsDelivered[newState.currentEgg] || 0) + passiveEggs,
    },
  };

  const finalSnap = computeSnapshot(newState, context, { skipGrowth: true });
  waitAction.endState = finalSnap;
  waitAction.totalTimeSeconds = seconds;
  waitAction.bankDelta = snap.offlineEarnings * seconds;

  actions.push(waitAction);

  return { currentState: newState, elapsedSeconds: elapsedSeconds + seconds };
}

/**
 * @param currentState    Current engine state.
 * @param actions         Action log array — pushed to in place.
 * @param elapsedSeconds  Elapsed simulation seconds so far.
 * @param context         Simulation context.
 * @param baseAbsTime     Absolute sim time at `elapsedSeconds === 0` (i.e.
 *                         `context.ascensionStartTime + ((startState.lastStepTime || 0) - context.planStartOffset)`
 *                         — same "subtract `planStartOffset` from sim time" convention used everywhere else this
 *                         conversion happens, e.g. `engine/simulate.ts`/`engine/apply/duration.ts`).
 * @param totalSeconds    Seconds to advance.
 */
export function advanceTimeWithBoundaries(
  currentState: EngineState,
  actions: Action[],
  elapsedSeconds: number,
  context: SimulationContext,
  baseAbsTime: number,
  totalSeconds: number
): AdvanceTimeResult {
  let remaining = totalSeconds;

  while (remaining > 0) {
    const absTime = baseAbsTime + elapsedSeconds;
    const nextSaleStart = getNextSaleStart(absTime);
    const nextBoostStart = getNextEarningsBoostStart(absTime);
    const nextBoostEnd = getNextEarningsBoostEnd(absTime);

    const boundaries = [
      { time: nextSaleStart, type: 'research_sale' },
      { time: getNextSaleEnd(absTime), type: 'research_sale_end' },
      { time: nextBoostStart, type: 'earnings_boost' },
      { time: nextBoostEnd, type: 'earnings_boost_end' },
    ].filter(b => b.time > absTime).sort((a, b) => a.time - b.time);

    const nextBoundary = boundaries[0];

    let stepSeconds = remaining;
    let targetEvent: string | undefined;

    if (nextBoundary && (nextBoundary.time - absTime) <= remaining) {
      stepSeconds = nextBoundary.time - absTime;
      targetEvent = nextBoundary.type;
    }

    if (stepSeconds > 0) {
      let actionType: any = 'wait_for_time';
      if (targetEvent === 'research_sale') actionType = 'wait_for_research_sale';
      else if (targetEvent === 'earnings_boost') actionType = 'wait_for_earnings_boost';

      const snap = computeSnapshot(currentState, context, { skipGrowth: true });
      const waitAction = createSimAction(actionType, { totalTimeSeconds: stepSeconds });
      const passiveEggs = calculateEggsDeliveredForTime(stepSeconds, snap);

      currentState = applyAction(currentState, waitAction);
      currentState = {
        ...currentState,
        lastStepTime: (currentState.lastStepTime || 0) + stepSeconds,
        bankValue: (currentState.bankValue || 0) + snap.offlineEarnings * stepSeconds,
        eggsDelivered: { ...currentState.eggsDelivered, [currentState.currentEgg]: (currentState.eggsDelivered[currentState.currentEgg] || 0) + passiveEggs },
      };

      const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      waitAction.endState = finalSnap;
      waitAction.totalTimeSeconds = stepSeconds;
      waitAction.bankDelta = snap.offlineEarnings * stepSeconds;

      actions.push(waitAction);
      elapsedSeconds += stepSeconds;
      remaining -= stepSeconds;
    }

    const newAbsTime = baseAbsTime + elapsedSeconds;

    const isBoostNow = isEarningsBoostActive(newAbsTime);
    if (currentState.earningsBoost?.active !== isBoostNow) {
      const toggleBoost = createSimAction('toggle_earnings_boost', {
        active: isBoostNow,
        multiplier: 2,
      });
      currentState = applyAction(currentState, toggleBoost);
      toggleBoost.endState = computeSnapshot(currentState, context, { skipGrowth: true });
      actions.push(toggleBoost);
    }

    const isSaleNow = isResearchSaleActive(newAbsTime);
    if (currentState.activeSales?.research !== isSaleNow) {
      const toggleSale = createSimAction('toggle_sale', {
        saleType: 'research',
        active: isSaleNow,
        multiplier: 0.3, // 70% off — matches every other toggle_sale creator (commonResearch.ts's
        // getDiscountedVirtuePrice is the actual price authority and is independently hardcoded to
        // the same 0.3; this field is purely descriptive/display, but 0.35 here was inconsistent
        // with it and with every other call site (ResearchActions.vue, ShiftActions.vue,
        // WaitForEventActions.vue, useEventExpiry.ts, actionHelpers.ts).
      });
      currentState = applyAction(currentState, toggleSale);
      toggleSale.endState = computeSnapshot(currentState, context, { skipGrowth: true });
      actions.push(toggleSale);
    }
  }

  return { currentState, elapsedSeconds };
}
