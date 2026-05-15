import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import { applyAction } from '../../engine/apply';

/**
 * H1: Shift to Humility and switch to optimal ELR artifacts.
 */
export function runH1(state: EngineState, context: SimulationContext): ShiftResult {
  const backup = context.rawBackup;
  if (!backup) {
    return {
      actions: [],
      elapsedSeconds: 0,
      endState: state,
    };
  }

  // Compute optimal ELR set based on current state
  const optimalSet = getOptimalELRSet(backup, {
    commonResearch: state.researchLevels,
    epicResearchLevels: context.epicResearchLevels,
    colleggtibleModifiers: context.colleggtibleModifiers,
    assumeMaxHabsVehicles: true, // H1 is near the end, we likely have CU and max vehicles
  });

  const actions: Action[] = [];

  // 1. Shift to Humility
  const sCost = shiftCost(state.soulEggs, state.shiftCount);
  const shiftAction = createSimAction(
    'shift',
    {
      fromEgg: state.currentEgg,
      toEgg: 'humility',
      newShiftCount: state.shiftCount + 1,
    },
    sCost
  );

  let currentState = applyAction(state, shiftAction);
  actions.push(shiftAction as unknown as any);

  // 2. Change Artifacts
  const artifactAction = createSimAction('change_artifacts', {
    fromLoadout: currentState.artifactLoadout,
    toLoadout: optimalSet,
  });

  currentState = applyAction(currentState, artifactAction);
  actions.push(artifactAction as unknown as any);

  console.log('H1 Finished: New artifacts equipped');

  return {
    actions,
    elapsedSeconds: 0, // Swapping artifacts is instantaneous
    endState: currentState,
  };
}
