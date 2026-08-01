import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { applyShiftAction } from './helpers/actionHelpers';
import { runMaxVehiclesPlan } from './helpers/vehicles';

/**
 * K1 Shift Strategy:
 * 1. Shift to Kindness.
 * 2. Buy as many vehicles as the time budget allows, maximizing shipping capacity.
 *
 * `runMaxVehiclesPlan` maxes slots depth-first (fully upgrades one slot before moving to the
 * next). Under a tight `timeLimit` (this shift's default is 1800s, early in an ascension when
 * earnings are low) that can leave later slots at zero capacity instead of spreading purchases
 * across all slots first — unverified whether that matters in practice; worth a before/after
 * check on early-ascension plans if K1's output looks off.
 */
export function runK1(startState: EngineState, context: SimulationContext, timeLimit: number = 1800): ShiftResult {
  const { state, action: shiftAction } = applyShiftAction(startState, context, 'kindness');
  const plan = runMaxVehiclesPlan(state, context, timeLimit);

  return {
    actions: [shiftAction, ...plan.actions],
    elapsedSeconds: plan.elapsedSeconds,
    endState: plan.endState,
  };
}
