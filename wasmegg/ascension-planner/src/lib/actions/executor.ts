/**
 * Action Executor Registry
 *
 * EXTENSION GUIDE FOR CLAUDE:
 * To add a new action type:
 * 1. Create executor file in src/lib/actions/executors/<type>.ts
 * 2. Import and register in executorMap below
 * 3. Add dependency rules in computeDependencies() if needed
 */

import type {
  ActionType,
  ActionPayloadMap,
  Action,
  BuyVehiclePayload,
  BuyResearchPayload,
  BuyTrainCarPayload,
  BuySiloPayload,
  VirtueEgg,
} from '@/types';
import type { ArtifactSlotPayload } from '@/types';
import { getResearchById, TIER_UNLOCK_THRESHOLDS } from '@/calculations/commonResearch';
import { startAscensionExecutor } from './executors/startAscension';
import { buyVehicleExecutor } from './executors/buyVehicle';
import { buyHabExecutor } from './executors/buyHab';
import { buyResearchExecutor } from './executors/buyResearch';
import { shiftExecutor } from './executors/shift';
import { buyTrainCarExecutor } from './executors/buyTrainCar';
import { changeArtifactsExecutor } from './executors/changeArtifacts';
import { buySiloExecutor } from './executors/buySilo';
import { storeFuelExecutor } from './executors/storeFuel';
import { waitForTEExecutor } from './executors/waitForTE';
import { launchMissionsExecutor } from './executors/launchMissions';
import { toggleSaleExecutor } from './executors/toggleSale';
import { equipArtifactSetExecutor } from './executors/equipArtifactSet';
import { updateArtifactSetExecutor } from './executors/updateArtifactSet';
import { waitForMissionsExecutor } from './executors/wait_for_missions';
import { waitForSleepExecutor } from './executors/wait_for_sleep';

// ============================================================================
// Executor Interface
// ============================================================================

/**
 * Interface for action executors.
 * Each action type needs an executor that handles its logic.
 */
export interface ActionExecutor<T extends ActionType> {
  /**
   * Apply the action to stores and return the cost.
   */
  execute(payload: ActionPayloadMap[T], context: ExecutorContext): number;

  /**
   * Get a human-readable display name for the action.
   */
  getDisplayName(payload: ActionPayloadMap[T]): string;

  /**
   * Get a description of the action's effect.
   */
  getEffectDescription(payload: ActionPayloadMap[T]): string;
}

/**
 * Context passed to executors with store access.
 */
export interface ExecutorContext {
  // Store setters
  setHab(slotIndex: number, habId: number | null): void;
  setVehicle(slotIndex: number, vehicleId: number | null): void;
  setTrainLength(slotIndex: number, length: number): void;
  setResearchLevel(researchId: string, level: number): void;
  setArtifactLoadout(loadout: ArtifactSlotPayload[]): void;
  setSiloCount(count: number): void;
  addFuel(egg: VirtueEgg, amount: number): boolean;
  addEggsDelivered(egg: VirtueEgg, amount: number): void;

  // Current state readers
  getHabIds(): (number | null)[];
  getVehicles(): { vehicleId: number | null; trainLength: number }[];
  getResearchLevels(): Record<string, number>;
  getSiloCount(): number;
  getSiloCapacityLevel(): number;
  getFuelAmounts(): Record<VirtueEgg, number>;
  getEggsDelivered(): Record<VirtueEgg, number>;
  getTEEarned(): Record<VirtueEgg, number>;

  // Cost modifiers
  getHabCostModifiers(): { cheaperContractorsLevel: number; flameRetardantMultiplier: number };
  getVehicleCostModifiers(): { bustUnionsLevel: number; lithiumMultiplier: number };
  getResearchCostModifiers(): { labUpgradeLevel: number; waterballoonMultiplier: number; puzzleCubeMultiplier: number };
}

// ============================================================================
// Executor Registry
// ============================================================================

/**
 * Map of action types to their executors.
 * Add new executors here when extending the system.
 */
const executorMap: { [K in ActionType]: ActionExecutor<K> } = {
  start_ascension: startAscensionExecutor,
  buy_vehicle: buyVehicleExecutor,
  buy_hab: buyHabExecutor,
  buy_research: buyResearchExecutor,
  shift: shiftExecutor,
  buy_train_car: buyTrainCarExecutor,
  change_artifacts: changeArtifactsExecutor,
  buy_silo: buySiloExecutor,
  store_fuel: storeFuelExecutor,
  wait_for_te: waitForTEExecutor,
  launch_missions: launchMissionsExecutor,
  toggle_sale: toggleSaleExecutor,
  equip_artifact_set: equipArtifactSetExecutor,
  update_artifact_set: updateArtifactSetExecutor,
  wait_for_missions: waitForMissionsExecutor,
  wait_for_sleep: waitForSleepExecutor,
};

/**
 * Get the executor for an action type.
 */
export function getExecutor<T extends ActionType>(type: T): ActionExecutor<T> {
  return executorMap[type];
}

// ============================================================================
// Dependency Computation
// ============================================================================

/**
 * Compute dependencies for a new action based on existing actions.
 * Returns array of action IDs that this action depends on.
 *
 * Dependency rules:
 * - Research level N depends on the action that bought level N-1
 * - Hyperloop train cars 6-10 depend on graviton coupling research
 * - Train cars depend on the hyperloop vehicle purchase in that slot
 * - Add more rules here as needed
 */
export function computeDependencies(
  type: ActionType,
  payload: ActionPayloadMap[ActionType],
  existingActions: Action[]
): string[] {
  const deps: string[] = [];

  // 1. Every action depends on the most recent shift/start_ascension (the "group header")
  // This ensures that undoing a shift also undoes all actions performed during that shift.
  const lastHeader = [...existingActions].reverse().find(
    a => a.type === 'shift' || a.type === 'start_ascension'
  );
  if (lastHeader) {
    deps.push(lastHeader.id);
  }

  // Research level dependencies
  // Level N depends on the action that bought level N-1
  if (type === 'buy_research') {
    const researchPayload = payload as BuyResearchPayload;

    // If buying level > 1, find the action that bought the previous level
    if (researchPayload.fromLevel > 0) {
      const previousLevelAction = findResearchLevelAction(
        existingActions,
        researchPayload.researchId,
        researchPayload.fromLevel // The level we're upgrading FROM is the toLevel of the previous action
      );
      if (previousLevelAction) {
        deps.push(previousLevelAction.id);
      }
    }
  }

  // Train car dependencies (for hyperloop via buy_vehicle)
  if (type === 'buy_vehicle') {
    const vehiclePayload = payload as BuyVehiclePayload;

    // If buying hyperloop with train length > 5, depends on graviton coupling
    if (vehiclePayload.vehicleId === 11 && vehiclePayload.trainLength && vehiclePayload.trainLength > 5) {
      const requiredGCLevel = vehiclePayload.trainLength - 5;
      const gcAction = findGravitonCouplingAction(existingActions, requiredGCLevel);
      if (gcAction) deps.push(gcAction.id);
    }
  }

  // Train car dependencies (via buy_train_car action)
  if (type === 'buy_train_car') {
    const carPayload = payload as BuyTrainCarPayload;

    // Depends on the hyperloop vehicle purchase in that slot
    const hyperloopAction = findHyperloopPurchase(existingActions, carPayload.slotIndex);
    if (hyperloopAction) deps.push(hyperloopAction.id);

    // Depends on the previous train car purchase in that slot (if not car #2)
    if (carPayload.fromLength >= 2) {
      const prevCarAction = findTrainCarAction(existingActions, carPayload.slotIndex, carPayload.fromLength);
      if (prevCarAction) deps.push(prevCarAction.id);
    }

    // If buying car 6-10, depends on graviton coupling research
    if (carPayload.toLength > 5) {
      const requiredGCLevel = carPayload.toLength - 5;
      const gcAction = findGravitonCouplingAction(existingActions, requiredGCLevel);
      if (gcAction) deps.push(gcAction.id);
    }
  }

  // Silo dependencies
  // Silo N depends on the action that bought silo N-1
  if (type === 'buy_silo') {
    const siloPayload = payload as BuySiloPayload;

    // If buying silo > 2, find the action that bought the previous silo
    if (siloPayload.fromCount > 1) {
      const previousSiloAction = findSiloPurchaseAction(existingActions, siloPayload.fromCount);
      if (previousSiloAction) {
        deps.push(previousSiloAction.id);
      }
    }
  }

  // Artifact Set Dependencies
  if (type === 'update_artifact_set' || type === 'equip_artifact_set') {
    // These actions are self-contained but follow the group header
    // No additional specific dependencies needed for now
  }

  // Tier unlock dependencies
  if (type === 'buy_research') {
    const researchPayload = payload as BuyResearchPayload;
    const research = getResearchById(researchPayload.researchId);
    if (research && research.tier > 1) {
      const threshold = TIER_UNLOCK_THRESHOLDS[research.tier - 1];
      const thresholdAction = findNthResearchPurchase(existingActions, threshold);
      if (thresholdAction) {
        deps.push(thresholdAction.id);
      }
    }
  }

  return deps;
}

/**
 * Find the N-th research purchase in the entire history (across all tiers).
 * This is the action that definitively unlocked a higher tier.
 */
function findNthResearchPurchase(actions: Action[], n: number): Action | undefined {
  let count = 0;
  for (const action of actions) {
    if (action.type === 'buy_research') {
      const payload = action.payload as BuyResearchPayload;
      const levelsBought = payload.toLevel - payload.fromLevel;
      count += levelsBought;
      if (count >= n) {
        return action;
      }
    }
  }
  return undefined;
}

/**
 * Find the research action that purchased a specific level of a research.
 */
function findResearchLevelAction(
  actions: Action[],
  researchId: string,
  toLevel: number
): Action | undefined {
  return actions.find(
    a => a.type === 'buy_research' &&
      (a.payload as BuyResearchPayload).researchId === researchId &&
      (a.payload as BuyResearchPayload).toLevel === toLevel
  );
}

/**
 * Find the graviton coupling research action that unlocked a specific train length.
 */
function findGravitonCouplingAction(
  actions: Action[],
  minLevel: number
): Action | undefined {
  // Find the earliest action that gave us at least this level
  return actions.find(
    a => a.type === 'buy_research' &&
      (a.payload as BuyResearchPayload).researchId === 'micro_coupling' &&
      (a.payload as BuyResearchPayload).toLevel >= minLevel
  );
}

/**
 * Find the action that bought the hyperloop train in a specific slot.
 */
function findHyperloopPurchase(
  actions: Action[],
  slotIndex: number
): Action | undefined {
  return actions.find(
    a => a.type === 'buy_vehicle' &&
      (a.payload as BuyVehiclePayload).slotIndex === slotIndex &&
      (a.payload as BuyVehiclePayload).vehicleId === 11
  );
}

/**
 * Find the action that bought a specific train car in a slot.
 */
function findTrainCarAction(
  actions: Action[],
  slotIndex: number,
  toLength: number
): Action | undefined {
  return actions.find(
    a => a.type === 'buy_train_car' &&
      (a.payload as BuyTrainCarPayload).slotIndex === slotIndex &&
      (a.payload as BuyTrainCarPayload).toLength === toLength
  );
}

/**
 * Find the action that bought a specific silo number.
 * @param toCount The silo count after the purchase (e.g., 3 for silo #3)
 */
function findSiloPurchaseAction(
  actions: Action[],
  toCount: number
): Action | undefined {
  return actions.find(
    a => a.type === 'buy_silo' &&
      (a.payload as BuySiloPayload).toCount === toCount
  );
}

/**
 * Check if an action would create invalid state if removed.
 * Used for dependency validation during undo.
 */
export function wouldCreateInvalidState(
  actionToRemove: Action,
  remainingActions: Action[]
): { invalid: boolean; reason?: string } {
  // Check if any remaining action depends on the removed action
  for (const action of remainingActions) {
    if (action.dependsOn.includes(actionToRemove.id)) {
      return {
        invalid: true,
        reason: `Action "${getExecutor(action.type).getDisplayName(action.payload)}" depends on this action`,
      };
    }
  }

  return { invalid: false };
}
