import type { EngineState, SimulationContext, ShiftResult } from '../types';
import { computeSnapshot } from '../../engine/compute';
import { applyAction } from '../../engine/apply';
import { createSimAction } from '@/types/actions/meta';
import { computeRealisticELR } from '../../calculations/realisticELR';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { countTEThresholdsPassed } from '@/lib/truthEggs';
import { computeTEEarned, timeToEarnTE } from '../te-thresholds';
import { applyShiftAction } from './helpers/actionHelpers';
import { runMaxVehiclesPlan } from './helpers/vehicles';

/**
 * K3 Shift Strategy:
 * 1. Shift to Kindness.
 * 2. Buy any remaining vehicles/trains unlocked by C3.
 * 3. Compute peak ELR.
 * 4. Wait until buildPhaseEnd.
 */
export function runK3(
  startState: EngineState,
  context: SimulationContext,
  buildPhaseEnd: number = 0,
  targetTEForEgg?: number
): ShiftResult {
  // 1. Shift to Kindness
  const shifted = applyShiftAction(startState, context, 'kindness');

  // 2. Buy any remaining vehicles/trains (unbounded, same as this shift's previous behavior)
  const vehiclePlan = runMaxVehiclesPlan(shifted.state, context, Infinity);

  let currentState = vehiclePlan.endState;
  let elapsedSeconds = vehiclePlan.elapsedSeconds;
  const actions = [shifted.action, ...vehiclePlan.actions];

  const getAbsTime = () =>
    context.ascensionStartTime + ((startState.lastStepTime || 0) - context.planStartOffset) + elapsedSeconds;

  // 3. Compute peak ELR
  const artMods = calculateArtifactModifiers(currentState.artifactLoadout);
  const elrResult = computeRealisticELR(
    currentState.researchLevels,
    artMods,
    context.epicResearchLevels,
    context.colleggtibleModifiers
  );

  const peakELR = elrResult.effectiveRate;
  currentState.maxELR = peakELR;

  // Attach peakELR to the shift action (the first action) so the UI summary can find it easily
  if (actions.length > 0 && actions[0].type === 'shift') {
    actions[0].payload.peakELR = peakELR;
  }

  // 4. Wait
  const absTimeAfterPurchases = getAbsTime();
  let waitDuration = Math.max(0, buildPhaseEnd - absTimeAfterPurchases);

  if (targetTEForEgg !== undefined) {
    const currentEggsDelivered = currentState.eggsDelivered['kindness'] || 0;
    const currentTE = countTEThresholdsPassed(currentEggsDelivered);
    const neededTE = Math.max(0, targetTEForEgg - currentTE);

    if (neededTE > 0) {
      const teWaitTime = timeToEarnTE(currentEggsDelivered, peakELR, neededTE);
      // We wait until buildPhaseEnd (end of sale) but extend it if more TE is needed.
      waitDuration = Math.max(waitDuration, teWaitTime);
    }
  }

  if (waitDuration > 0) {
    const currentEggsDelivered = currentState.eggsDelivered['kindness'] || 0;
    const currentTE = countTEThresholdsPassed(currentEggsDelivered);

    const teResult = computeTEEarned(currentEggsDelivered, peakELR, waitDuration);

    const waitAction = createSimAction('wait_for_te', {
      egg: 'kindness',
      targetTE: currentTE + teResult.teEarned,
      teGained: teResult.teEarned,
      eggsToLay: teResult.finalEggsDelivered - currentEggsDelivered,
      timeSeconds: waitDuration,
      startEggsDelivered: currentEggsDelivered,
      startTE: currentTE,
    });

    currentState = applyAction(currentState, waitAction);

    const snap = computeSnapshot(currentState, context, { skipGrowth: true });
    currentState.bankValue += snap.offlineEarnings * waitDuration;

    currentState.eggsDelivered = { ...currentState.eggsDelivered, kindness: teResult.finalEggsDelivered };
    currentState.teEarned = {
      ...currentState.teEarned,
      kindness: (currentState.teEarned['kindness'] || 0) + teResult.teEarned,
    };
    currentState.te = Object.values(currentState.teEarned).reduce((a, b) => (a as number) + (b as number), 0);

    // Decoration
    const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
    waitAction.endState = finalSnap;
    waitAction.totalTimeSeconds = waitDuration;
    waitAction.bankDelta = snap.offlineEarnings * waitDuration;

    actions.push(waitAction);
    elapsedSeconds += waitDuration;
  }

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
