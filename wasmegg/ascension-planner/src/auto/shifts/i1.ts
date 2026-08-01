import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { applyShiftAction } from './helpers/actionHelpers';
import { runHabPurchasePlan } from './helpers/habs';

/**
 * I1 Shift Strategy:
 * 1. Shift to Integrity.
 * 2. Buy hab upgrades — quick interim wins where available, working toward all 4 slots holding
 *    Chicken Universes.
 *
 * `runHabPurchasePlan` re-evaluates the best next purchase every step, across all 4 slots, rather
 * than a single upfront decision — unverified whether that changes I1's simulated output; worth a
 * before/after check if I1's output looks off.
 */
export function runI1(startState: EngineState, context: SimulationContext, timeLimit: number = 7200): ShiftResult {
  const { state, action: shiftAction } = applyShiftAction(startState, context, 'integrity');
  const plan = runHabPurchasePlan(state, context, timeLimit);

  return {
    actions: [shiftAction, ...plan.actions],
    elapsedSeconds: plan.elapsedSeconds,
    endState: plan.endState,
  };
}
