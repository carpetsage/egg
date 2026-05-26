/**
 * Fast-path research buyer for cheap items (≤ thresholdSeconds of waiting).
 *
 * Both C1 and C2 use this pattern. Extracted here to avoid duplication.
 *
 * Why a standalone function instead of a closure:
 *   The algorithm mutates three values owned by the caller (currentState, elapsedSeconds,
 *   offlineEarnings). Since these are JS primitives / reassigned references, we can't
 *   mutate them through a shared object without wrappers. Instead we accept them as inputs
 *   and return the updated values; the caller reassigns its own locals from the result.
 *
 * Why this is fast:
 *  - applyAction for 'wait_for_time' is a no-op — advanceTime's manual bank update is
 *    replicated here without calling computeSnapshot.
 *  - mods (artifact/epic/colleggtible multipliers) are constant during research buys.
 *  - offlineEarnings only changes when earnings-category research is bought; cached otherwise.
 *  - Sale/boost boundaries occur at most weekly. Skipping per-item boundary detection inside
 *    a ≤3s wait is inconsequential; we re-check isSale each iteration so the first buy after
 *    a sale toggle still uses the correct price.
 *  - bankValue is read from currentState.bankValue, which applyAction keeps in sync.
 *
 * Snapshot recomputes are limited to once per earnings-affecting purchase.
 */

import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext } from '../types';
import {
  getCommonResearches,
  getDiscountedVirtuePrice,
  isTierUnlocked,
  type ResearchCostModifiers,
} from '../../calculations/commonResearch';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { isResearchSaleActive } from '../calendar';

export const QUICK_BUY_THRESHOLD_SECONDS = 3;

export interface QuickWinsResult {
  /** Number of research items purchased. */
  count: number;
  /** Updated engine state (currentState is replaced, not mutated). */
  currentState: EngineState;
  /** Updated elapsed simulation seconds. */
  elapsedSeconds: number;
  /** Updated cached earnings rate (may change if earnings research was bought). */
  offlineEarnings: number;
}

/**
 * Buy all research purchasable within `thresholdSeconds` of waiting.
 *
 * @param currentState     Current engine state.
 * @param actions          Action log array — pushed to in place.
 * @param elapsedSeconds   Elapsed simulation seconds so far.
 * @param offlineEarnings  Cached earnings rate (Virtue/s).
 * @param mods             Pre-computed cost modifiers (constant for a given shift).
 * @param context          Simulation context.
 * @param getAbsTime       Returns the current absolute simulation time.
 * @param approximateSnap  Snapshot used as endState for generated actions (approximate is fine).
 * @param timeLimit        Hard ceiling on elapsedSeconds.
 * @param earningsCategories Research categories that affect offlineEarnings (triggers recompute).
 * @param thresholdSeconds Maximum wait-time per item (default: QUICK_BUY_THRESHOLD_SECONDS).
 */
export function runQuickWins(
  currentState: EngineState,
  actions: Action[],
  elapsedSeconds: number,
  offlineEarnings: number,
  mods: ResearchCostModifiers,
  context: SimulationContext,
  getAbsTime: () => number,
  approximateSnap: any,
  timeLimit: number,
  earningsCategories: readonly string[],
  thresholdSeconds: number = QUICK_BUY_THRESHOLD_SECONDS,
): QuickWinsResult {
  let count = 0;
  if (offlineEarnings <= 0) return { count, currentState, elapsedSeconds, offlineEarnings };

  while (elapsedSeconds <= timeLimit) {
    const isSale = isResearchSaleActive(getAbsTime());
    const bankValue = currentState.bankValue || 0;

    // Find cheapest available research within the wait-time threshold.
    const candidate = getCommonResearches()
      .filter(r => (currentState.researchLevels[r.id] || 0) < r.levels)
      .filter(r => isTierUnlocked(currentState.researchLevels, r.tier))
      .map(r => ({
        r,
        price: getDiscountedVirtuePrice(r, currentState.researchLevels[r.id] || 0, mods, isSale),
      }))
      .filter(({ price }) => {
        const timeToSave = Math.max(0, (price - bankValue) / offlineEarnings);
        return timeToSave <= thresholdSeconds && elapsedSeconds + timeToSave <= timeLimit;
      })
      .sort((a, b) => a.price - b.price)[0];

    if (!candidate) break;

    const { r, price } = candidate;
    const currentLevel = currentState.researchLevels[r.id] || 0;
    const timeToSave = Math.max(0, (price - bankValue) / offlineEarnings);

    // Fast wait: skip advanceTime (its applyAction for wait_for_time is a no-op anyway)
    // and skip boundary detection (inconsequential inside ≤3s per user preference).
    if (timeToSave > 0) {
      const waitAction = createSimAction('wait_for_time', { totalTimeSeconds: timeToSave });
      currentState = {
        ...currentState,
        lastStepTime: (currentState.lastStepTime || 0) + timeToSave,
        bankValue: bankValue + offlineEarnings * timeToSave,
      };
      waitAction.endState = approximateSnap;
      waitAction.totalTimeSeconds = timeToSave;
      waitAction.bankDelta = offlineEarnings * timeToSave;
      actions.push(waitAction);
      elapsedSeconds += timeToSave;
    }

    // Buy directly — skip the buyResearch wrapper and its redundant snapshot calls.
    const action = createSimAction('buy_research', {
      researchId: r.id,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
    }, price);
    currentState = applyAction(currentState, action);
    action.totalTimeSeconds = 0;
    action.bankDelta = -price;
    action.endState = approximateSnap;
    actions.push(action);
    count++;

    // Only recompute offlineEarnings when earnings-category research was bought.
    if (earningsCategories.some(cat => r.categories.includes(cat))) {
      const updatedSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      offlineEarnings = updatedSnap.offlineEarnings;
    }
  }

  return { count, currentState, elapsedSeconds, offlineEarnings };
}
