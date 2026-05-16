import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';

/**
 * Calculates the total eggs laid during a sequence of actions.
 * Assumes habitats were full the entire time.
 */
export function calculateEggsLaidDuringActions(
  actions: Action[],
  startState: EngineState,
  context: SimulationContext
): number {
  let currentState = { ...startState };
  let totalEggs = 0;

  for (const action of actions) {
    // Before applying the action, we compute the ELR of the current state.
    // If the action has a duration (wait_for_time), we lay eggs at this ELR.
    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    
    if (action.type === 'wait_for_time') {
      const duration = action.payload.totalTimeSeconds || 0;
      totalEggs += snap.elr * duration;
    }

    // Apply the action to move to the next state
    currentState = applyAction(currentState, action);
  }

  return totalEggs;
}
