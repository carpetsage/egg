import { type Action, generateActionId } from '@/types/actions/meta';
import { computeSnapshot } from '@/engine/compute';
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
import { runC4, runI2, runR2, runH2, distributeTargetTE, solveTEForTimeBudget } from './shifts/te-wait';
import { getNextSaleStart, getNextSaleEnd, isResearchSaleActive, isEarningsBoostActive } from './calendar';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { computeRealisticELR } from '@/calculations/realisticELR';
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

type ShiftRunner = (state: EngineState, context: SimulationContext, arg3?: number, arg4?: number) => ShiftResult;

const allShifts: { name: string; run: ShiftRunner }[] = [
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
    if (result.actions.length > 0 && result.actions[0].type === 'shift') {
      result.actions[0].payload.eggsLaid = eggsLaid;
    }

    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
  }

  return { state: currentState, actions: currentActions, elapsedSeconds: totalElapsedSeconds };
}

/**
 * Calculates the peak ELR reachable at the end of the build phase (K3).
 * This simulates buying a full fleet of the best vehicles.
 */
function calculatePeakELR(state: EngineState, context: SimulationContext): number {
  const currentState = JSON.parse(JSON.stringify(state));
  const maxSlots = 17; // Max slots in Egg Inc
  const maxLen = 10;   // Max cars per train (conservative estimate, will be updated by K3)
  
  // Fill fleet with Hyperloops (ID 11)
  currentState.vehicles = [];
  for (let i = 0; i < maxSlots; i++) {
    currentState.vehicles.push({ vehicleId: 11, trainLength: maxLen });
  }

  const artMods = calculateArtifactModifiers(currentState.artifactLoadout);
  const elrResult = computeRealisticELR(
    currentState.researchLevels,
    artMods,
    context.epicResearchLevels,
    context.colleggtibleModifiers
  );
  
  return elrResult.effectiveRate;
}

/**
 * Orchestrates a complete 12-shift ascension (C1 does not count as a shift).
 * 
 * @param startState - Starting engine state
 * @param context - Simulation context
 * @param buildPhaseEnd - Unix timestamp when the build phase should end (C3 end/sale boundary)
 * @param startTime - Unix timestamp when the ascension starts
 * @param id - Optional ID for the ascension
 * @param targetTE - Final target total TE for the entire ascension
 * @param resumeData - Optional data to skip ahead in the simulation
 */
export function runAscension(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number,
  startTime: number,
  id: string = 'asc_0',
  targetTE?: number,
  targetEndTime?: number,
  resumeData?: { actions: Action[]; state: EngineState; elapsedSeconds: number; resumeShiftName: string }
): { actions: Action[]; summary: AscensionSummary } {
  const actualStartState = JSON.parse(JSON.stringify(startState));
  
  if (!resumeData) {
    actualStartState.activeSales.research = isResearchSaleActive(startTime);
    actualStartState.earningsBoost.active = isEarningsBoostActive(startTime);
    actualStartState.earningsBoost.multiplier = 2;
  }
  
  let currentState = resumeData ? JSON.parse(JSON.stringify(resumeData.state)) : JSON.parse(JSON.stringify(actualStartState));
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
      result = shift.run(currentState, context, buildPhaseEnd);
    } else if (shift.name === 'K3' || shift.name === 'C4' || shift.name === 'I2' || shift.name === 'R2' || shift.name === 'H2') {
      // For these shifts, we need the target TE split
      const currentTEs: any = {
        curiosity: countTEThresholdsPassed(currentState.eggsDelivered['curiosity'] || 0),
        integrity: countTEThresholdsPassed(currentState.eggsDelivered['integrity'] || 0),
        resilience: countTEThresholdsPassed(currentState.eggsDelivered['resilience'] || 0),
        humility: countTEThresholdsPassed(currentState.eggsDelivered['humility'] || 0),
        kindness: countTEThresholdsPassed(currentState.eggsDelivered['kindness'] || 0),
      };
      
      let peakELR = currentState.maxELR || 0;
      if (shift.name === 'K3' && peakELR === 0) {
        peakELR = calculatePeakELR(currentState, context);
      }
      
      let effectiveTargetTE = targetTE;
      if (targetEndTime && !effectiveTargetTE) {
        const timeBudget = Math.max(0, targetEndTime - (startTime + totalElapsedSeconds));
        effectiveTargetTE = solveTEForTimeBudget(currentTEs, currentState.eggsDelivered, peakELR, timeBudget);
      }

      const targets = distributeTargetTE(currentTEs, effectiveTargetTE || currentState.te);

      if (shift.name === 'K3') {
        result = shift.run(currentState, context, buildPhaseEnd, targets['kindness']);
      } else {
        const eggMap: Record<string, VirtueEgg> = { 'C4': 'curiosity', 'I2': 'integrity', 'R2': 'resilience', 'H2': 'humility' };
        result = shift.run(currentState, context, targets[eggMap[shift.name]], peakELR);
      }
    } else {
      result = shift.run(currentState, context);
    }

    // Calculate eggs laid during this shift (assuming full habs)
    const eggsLaid = calculateEggsLaidDuringActions(result.actions, currentState, context);
    if (result.actions.length > 0 && result.actions[0].type === 'shift') {
      result.actions[0].payload.eggsLaid = eggsLaid;
    }

    currentActions.push(...result.actions);
    currentState = result.endState;
    totalElapsedSeconds += result.elapsedSeconds;
  }

  // Prepend start action if not resuming
  if (!resumeData) {
    const startSnapshot = computeSnapshot(actualStartState, context);
    const startAction: Action = {
      id: generateActionId(),
      index: 0,
      timestamp: startTime * 1000,
      type: 'start_ascension',
      payload: { initialEgg: actualStartState.currentEgg as VirtueEgg },
      cost: 0,
      elrDelta: 0,
      offlineEarningsDelta: 0,
      eggValueDelta: 0,
      habCapacityDelta: 0,
      layRateDelta: 0,
      shippingCapacityDelta: 0,
      ihrDelta: 0,
      bankDelta: 0,
      populationDelta: 0,
      totalTimeSeconds: 0,
      endState: startSnapshot,
      dependsOn: [],
      dependents: [],
    };
    currentActions.unshift(startAction);
  }

  // Ensure indices are correct
  currentActions.forEach((a, idx) => {
    a.index = idx;
  });

  // SE cost tracking for 12 shifts (C1 does not count as a shift)
  const seResult = computeShiftCosts(startState.soulEggs, startState.shiftCount, 12);

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
    startTime,
    endTime: startTime + totalElapsedSeconds,
    totalDurationSeconds: totalElapsedSeconds,
    buildPhaseEndTime: buildPhaseEnd,
    buildPhaseSaleCount: (saleCount === 2 ? 2 : 1) as 1 | 2,
    startTE: startState.te,
    endTE: currentState.te,
    teGained: currentState.te - startState.te,
    maxELR: currentState.maxELR || 0,
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
