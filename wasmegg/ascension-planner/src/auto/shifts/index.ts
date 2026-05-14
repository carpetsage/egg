import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, AscensionSummary, ShiftResult } from '../types';
import { runC1 } from './c1';
import { runK1 } from './k1';
import { runI1 } from './i1';
import { runC2 } from './c2';
import { runK2 } from './k2';
import { runR1 } from './r1';
import { computeShiftCosts } from '../se-tracker';

/**
 * Orchestrates the 13-shift ascension sequence.
 * 
 * As of Phase 2, Step 2.2, only C1 is fully implemented.
 * The remaining shifts are stubs that return empty results.
 */
export function runAscension(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,
  startTime: number,
  // These might be provided by the tree builder
  id: string = 'asc_0',
  parentId: string | null = null,
  depth: number = 0,
): { actions: Action[]; summary: AscensionSummary } {
  let currentState = { ...startState };
  let currentActions: Action[] = [];
  let totalElapsedSeconds = 0;

  // 1. C1: Tier unlock + fleet + graviton + earnings ROI
  const c1Result = runC1(currentState, context);
  currentActions.push(...c1Result.actions);
  currentState = c1Result.endState;
  totalElapsedSeconds += c1Result.elapsedSeconds;

  // Stubs for remaining 12 shifts
  const runStub = (state: EngineState, _ctx: SimulationContext): ShiftResult => ({
    actions: [],
    elapsedSeconds: 0,
    endState: state,
  });

  // Shifts 2-13
  const remainingShifts = [
    runK1, // K1
    runI1, // I1
    runC2, // C2
    runK2, // K2
    runR1, // R1
    runStub, // C3
    runStub, // H1
    runStub, // K3
    runStub, // C4
    runStub, // I2
    runStub, // R2
    runStub, // H2
  ];

  for (const shift of remainingShifts) {
    const result = shift(currentState, context);
    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
  }

  // SE cost tracking for 13 shifts
  const seResult = computeShiftCosts(startState.soulEggs, startState.shiftCount, 13);

  // Build the summary
  const summary: AscensionSummary = {
    id,
    parentId,
    depth,
    startTime,
    endTime: startTime + totalElapsedSeconds,
    totalDurationSeconds: totalElapsedSeconds,
    buildPhaseEndTime: buildPhaseEnd,
    buildPhaseSaleCount: 1, // Placeholder
    startTE: startState.te,
    endTE: currentState.te,
    teGained: currentState.te - startState.te,
    maxELR: 0, // Will be computed after K3 in later phases
    startSoulEggs: startState.soulEggs,
    endSoulEggs: seResult.endingSE,
    startShiftCount: startState.shiftCount,
    endShiftCount: seResult.endingShiftCount,
    totalShiftCost: seResult.totalCost,
    eggsDelivered: { ...currentState.eggsDelivered },
    teEarned: { ...currentState.teEarned },
    strategyLabel: 'Initial Draft (C1 only)',
    isMaxELRAscension: false,
  };

  return {
    actions: currentActions,
    summary,
  };
}
