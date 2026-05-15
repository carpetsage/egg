import type { Action } from '@/types/actions/meta';
import { getNextPacificTime } from '@/lib/events';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { computeShiftCosts } from './se-tracker';
import { calculateEggsLaidDuringActions } from './engine/eggs';
import type { EngineState, SimulationContext, AscensionSummary, ShiftResult } from './types';
import { runC1 } from './shifts/c1';
import { runK1 } from './shifts/k1';
import { runI1 } from './shifts/i1';
import { runC2 } from './shifts/c2';
import { runK2 } from './shifts/k2';
import { runR1 } from './shifts/r1';
import { runC3 } from './shifts/c3';
import { runH1 } from './shifts/h1';
import { runK3 } from './shifts/k3';
import { runC4, runI2, runR2, runH2, distributeTargetTE } from './shifts/te-wait';
import { getNextSaleStart, getNextSaleEnd, isResearchSaleActive } from './calendar';
import type { VirtueEgg } from '@/types';

/**
 * Derives the starting state for the next ascension in a sequential chain.
 * Carries forward permanent metrics (TE, SE, shifts) and resets farm-specific progress.
 */
export function deriveNextStartState(
  prevSummary: AscensionSummary,
  baseBackupState: EngineState
): EngineState {
  const totalTE = Object.values(prevSummary.finalTE).reduce((a, b) => a + b, 0);

  return {
    ...JSON.parse(JSON.stringify(baseBackupState)), // Copy permanent upgrades, artifact sets, etc.
    
    // Carried forward metrics
    te: totalTE,
    teEarned: { ...prevSummary.finalTE },
    soulEggs: prevSummary.endSoulEggs,
    shiftCount: prevSummary.endShiftCount,

    // Reset farm-specific progress
    currentEgg: 'curiosity',
    population: 1,
    bankValue: 0,
    researchLevels: {},
    habIds: [0, null, null, null],
    vehicles: [{ vehicleId: 0, trainLength: 1 }],
    lastStepTime: 0,
    eggsDelivered: { ...prevSummary.eggsDelivered },
    
    // Reset active modifiers
    activeSales: {
      research: false,
      hab: false,
      vehicle: false,
    },
    earningsBoost: {
      active: false,
      multiplier: 1,
    },
  };
}

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
  { name: 'C4', run: runC4 },
  { name: 'I2', run: runI2 },
  { name: 'R2', run: runR2 },
  { name: 'H2', run: runH2 },
];

/**
 * Runs the simulation until a specific shift name is reached.
 * Useful for precomputing common phases or debugging.
 */
export function runUntilShift(
  startState: EngineState,
  context: SimulationContext,
  stopBeforeShift: string
) {
  let currentState = JSON.parse(JSON.stringify(startState));
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
  }

  return { state: currentState, actions: currentActions, elapsedSeconds: totalElapsedSeconds };
}

/**
 * Orchestrates a complete 13-shift ascension.
 * 
 * @param startState - Starting engine state
 * @param context - Simulation context
 * @param buildPhaseEnd - Unix timestamp when the build phase should end (C3 end/sale boundary)
 * @param startTime - Unix timestamp when the ascension starts
 * @param id - Optional ID for the ascension
 * @param parentId - Optional parent ID for tree tracking
 * @param depth - Depth in the decision tree
 * @param targetTE - Final target total TE for the entire ascension
 * @param resumeData - Optional data to skip ahead in the simulation
 */
export function runAscension(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,
  startTime: number,
  id: string = 'asc_0',
  parentId: string | null = null,
  depth: number = 0,
  targetTE?: number,
  resumeData?: { actions: Action[]; state: EngineState; elapsedSeconds: number; resumeShiftName: string }
): { actions: Action[]; summary: AscensionSummary } {
  let currentState = resumeData ? JSON.parse(JSON.stringify(resumeData.state)) : JSON.parse(JSON.stringify(startState));
  let currentActions: Action[] = resumeData ? [...resumeData.actions] : [];
  let totalElapsedSeconds = resumeData ? resumeData.elapsedSeconds : 0;

  let skip = resumeData ? true : false;

  for (const shift of allShifts) {
    if (skip) {
      if (shift.name === resumeData!.resumeShiftName) skip = false;
      else continue;
    }
    
    currentState.lastStepTime = totalElapsedSeconds;
    
    let result: ShiftResult;
    if (shift.name === 'C3') {
      result = (shift.run as any)(currentState, context, buildPhaseEnd);
    } else if (shift.name === 'K3' || shift.name === 'C4' || shift.name === 'I2' || shift.name === 'R2' || shift.name === 'H2') {
      // For these shifts, we need the target TE split
      const currentTEs: any = {
        curiosity: countTEThresholdsPassed(currentState.eggsDelivered['curiosity'] || 0),
        integrity: countTEThresholdsPassed(currentState.eggsDelivered['integrity'] || 0),
        resilience: countTEThresholdsPassed(currentState.eggsDelivered['resilience'] || 0),
        humility: countTEThresholdsPassed(currentState.eggsDelivered['humility'] || 0),
        kindness: countTEThresholdsPassed(currentState.eggsDelivered['kindness'] || 0),
      };
      
      const targets = distributeTargetTE(currentTEs, targetTE || currentState.te);
      const peakELR = (currentState as any).maxELR || 0;

      if (shift.name === 'K3') {
        result = (shift.run as any)(currentState, context, buildPhaseEnd, targets['kindness']);
      } else {
        const eggMap: any = { 'C4': 'curiosity', 'I2': 'integrity', 'R2': 'resilience', 'H2': 'humility' };
        result = (shift.run as any)(currentState, context, targets[eggMap[shift.name]], peakELR);
      }
    } else {
      result = (shift.run as any)(currentState, context);
    }

    // Calculate eggs laid during this shift (assuming full habs)
    const eggsLaid = calculateEggsLaidDuringActions(result.actions, currentState, context);
    if (result.actions.length > 0) {
      (result.actions[0].payload as any).eggsLaid = eggsLaid;
    }

    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
  }

  // SE cost tracking for 13 shifts
  const seResult = computeShiftCosts(startState.soulEggs, startState.shiftCount, 13);

  // Calculate sale count in build phase
  let saleCount = isResearchSaleActive(startTime) ? 1 : 0;
  let nextSale = getNextSaleStart(startTime);
  while (nextSale < buildPhaseEnd) {
    saleCount++;
    nextSale = getNextSaleStart(nextSale + 1);
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
    buildPhaseSaleCount: (saleCount === 2 ? 2 : 1) as 1 | 2,
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
    teEarned: {
      curiosity: (currentState.teEarned['curiosity'] || 0) - (startState.teEarned['curiosity'] || 0),
      integrity: (currentState.teEarned['integrity'] || 0) - (startState.teEarned['integrity'] || 0),
      resilience: (currentState.teEarned['resilience'] || 0) - (startState.teEarned['resilience'] || 0),
      humility: (currentState.teEarned['humility'] || 0) - (startState.teEarned['humility'] || 0),
      kindness: (currentState.teEarned['kindness'] || 0) - (startState.teEarned['kindness'] || 0),
    },
    finalTE: {
      curiosity: countTEThresholdsPassed(currentState.eggsDelivered['curiosity'] || 0),
      integrity: countTEThresholdsPassed(currentState.eggsDelivered['integrity'] || 0),
      resilience: countTEThresholdsPassed(currentState.eggsDelivered['resilience'] || 0),
      humility: countTEThresholdsPassed(currentState.eggsDelivered['humility'] || 0),
      kindness: countTEThresholdsPassed(currentState.eggsDelivered['kindness'] || 0),
    },
    strategyLabel: `${saleCount}-sale build`,
    isMaxELRAscension: false,
  };

  return {
    actions: currentActions,
    summary,
  };
}

/**
 * Runs a single complete ascension based on a sale count strategy.
 * 
 * @param startState - Starting engine state
 * @param context - Simulation context
 * @param startTime - Unix timestamp when the ascension starts
 * @param buildPhaseSaleCount - Number of research sales to include (1 or 2)
 * @param targetTE - Target total TE for the ascension
 * @param id - Optional ID
 * @returns Generated actions and summary
 */
export function runSingleAscension(
  startState: EngineState,
  context: SimulationContext,
  startTime: number,
  buildPhaseSaleCount: 1 | 2,
  targetTE: number,
  id: string = 'asc_0'
): { actions: Action[]; summary: AscensionSummary } {
  // Determine buildPhaseEnd based on sale count.
  // The build phase ends at the END of the Nth sale from startTime.
  let buildPhaseEnd: number;
  
  if (buildPhaseSaleCount === 1) {
    // 1-sale strategy: ends at the end of the very next sale
    buildPhaseEnd = getNextSaleEnd(startTime);
  } else {
    // 2-sale strategy: ends at the end of the second sale
    const firstSaleEnd = getNextSaleEnd(startTime);
    buildPhaseEnd = getNextSaleEnd(firstSaleEnd + 1);
  }

  return runAscension(
    startState,
    context,
    buildPhaseEnd,
    startTime,
    id,
    null,
    0,
    targetTE
  );
}
