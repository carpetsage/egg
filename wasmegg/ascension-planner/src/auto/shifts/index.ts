import type { Action } from '@/types/actions/meta';
import type { EngineState, SimulationContext, AscensionSummary, ShiftResult } from '../types';
import { runC1 } from './c1';
import { runK1 } from './k1';
import { runI1 } from './i1';
import { runC2 } from './c2';
import { runK2 } from './k2';
import { runR1 } from './r1';
import { runC3 } from './c3';
import { runH1 } from './h1';
import { runK3 } from './k3';
import { computeShiftCosts } from '../se-tracker';
import { calculateEggsLaidDuringActions } from '../engine/eggs';
import { getNextPacificTime } from '@/lib/events';

/**
 * Orchestrates the 13-shift ascension sequence.
 * 
 * As of Phase 2, Step 2.2, only C1 is fully implemented.
 * The remaining shifts are stubs that return empty results.
 */
  // Stubs for remaining 12 shifts
  const runStub = (state: EngineState, _ctx: SimulationContext, _buildPhaseEnd?: number): ShiftResult => ({
    actions: [],
    elapsedSeconds: 0,
    endState: state,
  });

  const allShifts = [
    { name: 'C1', run: runC1 },
    { name: 'K1', run: runK1 },
    { name: 'I1', run: runI1 },
    { name: 'C2', run: runC2 },
    { name: 'K2', run: runK2 },
    { name: 'R1', run: runR1 },
    { name: 'C3', run: runC3 },
    { name: 'H1', run: runH1 },
    { name: 'K3', run: runK3 },
    { name: 'C4', run: runStub },
    { name: 'I2', run: runStub },
    { name: 'R2', run: runStub },
    { name: 'H2', run: runStub },
  ];

export function runUntilShift(
  startState: EngineState,
  context: SimulationContext,
  stopBeforeShift: string
) {
  let currentState = { ...startState };
  let currentActions: Action[] = [];
  let totalElapsedSeconds = 0;

  for (const shift of allShifts) {
    if (shift.name === stopBeforeShift) break;
    currentState.lastStepTime = totalElapsedSeconds;
    const result = shift.run(currentState, context);

    // Calculate eggs laid during this shift (assuming full habs)
    const eggsLaid = calculateEggsLaidDuringActions(result.actions, currentState, context);
    if (result.actions.length > 0) {
      (result.actions[0].payload as any).eggsLaid = eggsLaid;
    }

    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
    // console.log(`[Shift Debug] ${shift.name} finished. Total research: ${calculateTotalPurchases(currentState.researchLevels)}`);
  }

  return { state: currentState, actions: currentActions, elapsedSeconds: totalElapsedSeconds };
}

export function runAscension(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,
  startTime: number,
  id: string = 'asc_0',
  parentId: string | null = null,
  depth: number = 0,
  resumeData?: { actions: Action[]; state: EngineState; elapsedSeconds: number; resumeShiftName: string }
): { actions: Action[]; summary: AscensionSummary } {
  let currentState = resumeData ? { ...resumeData.state } : { ...startState };
  let currentActions: Action[] = resumeData ? [...resumeData.actions] : [];
  let totalElapsedSeconds = resumeData ? resumeData.elapsedSeconds : 0;

  let skip = resumeData ? true : false;

  for (const shift of allShifts) {
    if (skip) {
      if (shift.name === resumeData!.resumeShiftName) skip = false;
      else continue;
    }
    
    currentState.lastStepTime = totalElapsedSeconds;
    const result = (shift.name === 'C3' || shift.name === 'K3') 
      ? (shift.run as any)(currentState, context, buildPhaseEnd) 
      : shift.run(currentState, context);

    // Calculate eggs laid during this shift (assuming full habs)
    const eggsLaid = calculateEggsLaidDuringActions(result.actions, currentState, context);
    if (result.actions.length > 0) {
      (result.actions[0].payload as any).eggsLaid = eggsLaid;
    }

    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
    // console.log(`[Shift Debug] ${shift.name} finished.`);
  }

  // SE cost tracking for 13 shifts
  const seResult = computeShiftCosts(startState.soulEggs, startState.shiftCount, 13);

  // Calculate sale count in build phase
  // A sale happens every Friday 9 AM PT to Saturday 9 AM PT.
  // We can count how many sale start times exist between startTime and buildPhaseEnd.
  let saleCount = 0;
  let nextSale = getNextPacificTime(5, 9, startTime);
  while (nextSale < buildPhaseEnd) {
    saleCount++;
    nextSale = getNextPacificTime(5, 9, nextSale + 1); // Move past current sale
  }

  // Build the summary
  const summary: AscensionSummary = {
    id,
    parentId,
    depth,
    startTime,
    endTime: startTime + totalElapsedSeconds,
    totalDurationSeconds: totalElapsedSeconds,
    buildPhaseEndTime: buildPhaseEnd,
    buildPhaseSaleCount: saleCount,
    startTE: startState.te,
    endTE: currentState.te,
    teGained: currentState.te - startState.te,
    maxELR: (currentState as any).maxELR || 0,
    startSoulEggs: startState.soulEggs,
    endSoulEggs: seResult.endingSE,
    startShiftCount: startState.shiftCount,
    endShiftCount: seResult.endingShiftCount,
    totalShiftCost: seResult.totalCost,
    eggsDelivered: { ...currentState.eggsDelivered },
    teEarned: { ...currentState.teEarned },
    strategyLabel: `Auto Plan (${saleCount} Sale${saleCount !== 1 ? 's' : ''})`,
    isMaxELRAscension: false,
  };

  return {
    actions: currentActions,
    summary,
  };
}
