import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { getOptimalELRSet } from '@/lib/artifacts/virtue';
import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import { shiftCost } from 'lib';
import { computeSnapshot } from '../../engine/compute';
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
  
  // Decoration
  const finalSnap1 = computeSnapshot(currentState, context, { skipGrowth: true });
  shiftAction.endState = finalSnap1;
  shiftAction.totalTimeSeconds = 0;

  actions.push(shiftAction);

  // 2. Update ELR Set
  const updateAction = createSimAction('update_artifact_set', {
    setName: 'elr',
    newLoadout: optimalSet,
  });

  currentState = applyAction(currentState, updateAction);
  
  // Decoration
  const finalSnap2 = computeSnapshot(currentState, context, { skipGrowth: true });
  updateAction.endState = finalSnap2;
  updateAction.totalTimeSeconds = 0;

  actions.push(updateAction);

  // 3. Equip ELR Set
  const equipAction = createSimAction('equip_artifact_set', {
    setName: 'elr',
  });

  currentState = applyAction(currentState, equipAction);
  
  // Decoration
  const finalSnap3 = computeSnapshot(currentState, context, { skipGrowth: true });
  equipAction.endState = finalSnap3;
  equipAction.totalTimeSeconds = 0;

  actions.push(equipAction);

  // console.log('H1 Finished: New artifacts equipped');

  return {
    actions,
    elapsedSeconds: 0, // Swapping artifacts is instantaneous
    endState: currentState,
  };
}
