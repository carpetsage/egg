/**
 * Generic single-action apply-and-decorate helpers, shared across shift files.
 *
 * Every purchase/toggle/shift action in every shift file follows the same sequence:
 * `applyAction` → `computeSnapshot` → set `endState`/`totalTimeSeconds`/`bankDelta` → (caller
 * pushes to its own `actions` array). `applyDecoratedAction` is that sequence, extracted once.
 * `applyShiftAction` is the "shift to egg X" version built on top of it.
 */

import type { Action, VirtueEgg } from '@/types';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import type { EngineState, SimulationContext } from '../../types';
import { computeSnapshot } from '../../../engine/compute';
import { applyAction } from '../../../engine/apply';

/**
 * Apply `action` to `state`, then decorate it with `endState`/`totalTimeSeconds`/`bankDelta` the
 * same way every shift file's purchase helpers already do. `action` is mutated in place (matching
 * the existing convention of decorating a `createSimAction` result before pushing it) and also
 * returned for convenience.
 *
 * `bankDelta` defaults to 0 — correct for actions that don't move `bankValue` directly (shifts,
 * artifact-set swaps); purchase call sites should pass `-price`.
 */
export function applyDecoratedAction(
  state: EngineState,
  context: SimulationContext,
  action: Action,
  bankDelta: number = 0
): { state: EngineState; action: Action } {
  const newState = applyAction(state, action);
  action.endState = computeSnapshot(newState, context, { skipGrowth: true });
  action.totalTimeSeconds = 0;
  action.bankDelta = bankDelta;
  return { state: newState, action };
}

/**
 * Shift to `toEgg`, decorated the same way every shift file's own copy of this block already
 * does. Shifting is instantaneous and spends soul eggs, not bank value, so it doesn't advance
 * `elapsedSeconds` and uses `applyDecoratedAction`'s default `bankDelta` of 0.
 */
export function applyShiftAction(
  state: EngineState,
  context: SimulationContext,
  toEgg: VirtueEgg
): { state: EngineState; action: Action } {
  const cost = shiftCost(state.soulEggs, state.shiftCount);
  const action = createSimAction(
    'shift',
    {
      fromEgg: state.currentEgg,
      toEgg,
      newShiftCount: state.shiftCount + 1,
    },
    cost
  );
  return applyDecoratedAction(state, context, action);
}
