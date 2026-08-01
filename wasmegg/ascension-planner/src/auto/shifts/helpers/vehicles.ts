import type { Action } from '@/types/actions/meta';
import { createSimAction } from '@/types/actions/meta';
import type { EngineState, SimulationContext, ShiftResult } from '../../types';
import { computeSnapshot } from '../../../engine/compute';
import { applyAction } from '../../../engine/apply';
import { advanceTimeFlat } from './advanceTime';
import {
  calculateMaxVehicleSlots,
  calculateMaxTrainLength,
  calculateShippingMultipliers,
} from '../../../calculations/shippingCapacity';
import { calculateArtifactModifiers } from '../../../lib/artifacts';
import { planMaxVehicles, type VehicleMultipliers } from '../../../calculations/vehiclePurchasePlan';
import type { VehicleCostModifiers } from '../../../lib/vehicles';

/**
 * `planMaxVehicles` plans against a snapshot up front; this executes that plan step-by-step
 * against a mutable `EngineState` using the flat-rate `advanceTimeFlat`. Unlike `milestones.ts`'s
 * boundary-aware version, this doesn't step onto sale/boost boundaries mid-wait.
 */
export function runMaxVehiclesPlan(
  startState: EngineState,
  context: SimulationContext,
  timeLimit: number
): ShiftResult {
  let currentState: EngineState = { ...startState };
  let elapsedSeconds = 0;
  const actions: Action[] = [];

  const costModifiers: VehicleCostModifiers = {
    bustUnionsLevel: context.epicResearchLevels['cheaper_vehicles'] || 0,
    vehicleCostMultiplier: context.colleggtibleModifiers.vehicleCost || 1,
  };

  const artifactMods = calculateArtifactModifiers(currentState.artifactLoadout);
  const transportationLobbyistLevel = context.epicResearchLevels['transportation_lobbyist'] || 0;
  const { universalMultiplier, hoverMultiplier, hyperloopMultiplier, epicMultiplier } = calculateShippingMultipliers(
    currentState.researchLevels,
    transportationLobbyistLevel
  );
  const multipliers: VehicleMultipliers = {
    universalMultiplier,
    hoverMultiplier,
    hyperloopMultiplier,
    epicMultiplier,
    shippingCapMultiplier: context.colleggtibleModifiers.shippingCap || 1,
    artifactMultiplier: artifactMods.shippingRate.totalMultiplier,
  };

  const maxSlots = calculateMaxVehicleSlots(currentState.researchLevels);
  const maxTrainLength = calculateMaxTrainLength(currentState.researchLevels);
  const startSnapshot = computeSnapshot(currentState, context, { skipGrowth: true });

  const plan = planMaxVehicles(
    currentState.vehicles,
    maxSlots,
    maxTrainLength,
    costModifiers,
    currentState.activeSales.vehicle,
    multipliers,
    startSnapshot
  );

  const trainLengths: Record<number, number> = {};

  for (const step of plan.steps) {
    if (elapsedSeconds + step.waitSeconds > timeLimit) break;

    const advanced = advanceTimeFlat(currentState, actions, elapsedSeconds, context, step.waitSeconds);
    currentState = advanced.currentState;
    elapsedSeconds = advanced.elapsedSeconds;

    if (step.type === 'upgrade_hyperloop') {
      const action = createSimAction('buy_vehicle', { slotIndex: step.slotIndex, vehicleId: 11 }, step.cost);
      currentState = applyAction(currentState, action);

      const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      action.endState = finalSnap;
      action.totalTimeSeconds = 0;
      action.bankDelta = -step.cost;

      actions.push(action);
      trainLengths[step.slotIndex] = 1;
    } else {
      const fromLength = trainLengths[step.slotIndex] ?? currentState.vehicles[step.slotIndex]?.trainLength ?? 1;
      const action = createSimAction(
        'buy_train_car',
        { slotIndex: step.slotIndex, fromLength, toLength: fromLength + 1 },
        step.cost
      );
      currentState = applyAction(currentState, action);

      const finalSnap = computeSnapshot(currentState, context, { skipGrowth: true });
      action.endState = finalSnap;
      action.totalTimeSeconds = 0;
      action.bankDelta = -step.cost;

      actions.push(action);
      trainLengths[step.slotIndex] = fromLength + 1;
    }
  }

  return {
    actions,
    elapsedSeconds,
    endState: currentState,
  };
}
