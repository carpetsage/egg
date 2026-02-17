import {
    Action,
    BuyVehiclePayload,
    BuyHabPayload,
    BuyResearchPayload,
    ShiftPayload,
    BuyTrainCarPayload,
    ChangeArtifactsPayload,
    BuySiloPayload,
    StoreFuelPayload,
    WaitForTEPayload,
    LaunchMissionsPayload,
    StartAscensionPayload,
    ToggleSalePayload,
    VirtueEgg,
} from '@/types';
import type { EngineState } from './types';
import type { CalculationsSnapshot } from '@/types';
import { eggsNeededForTE, countTEThresholdsPassed } from '@/lib/truthEggs';

/**
 * Recalculate an action's payload based on the state before it executes.
 * This is used for "dynamic" actions whose effects or durations depend
 * on the current state (like ELR-based waiting).
 */
export function refreshActionPayload(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): Action {
    if (action.type === 'wait_for_te') {
        const payload = { ...action.payload as WaitForTEPayload };
        const egg = payload.egg;
        const currentDelivered = prevSnapshot.eggsDelivered[egg] || 0;

        // Recalculate eggs needed based on targetTE intent
        payload.eggsToLay = eggsNeededForTE(currentDelivered, payload.targetTE);

        // Recalculate time based on new eggsToLay and current ELR
        payload.timeSeconds = prevSnapshot.elr > 0 ? payload.eggsToLay / prevSnapshot.elr : 0;

        // Update tracking fields
        payload.startEggsDelivered = currentDelivered;
        payload.startTE = countTEThresholdsPassed(currentDelivered);
        payload.teGained = Math.max(0, payload.targetTE - payload.startTE);

        return {
            ...action,
            payload,
        };
    }

    if (action.type === 'store_fuel') {
        const payload = { ...action.payload as StoreFuelPayload };

        // Recalculate time based on fixed amount and current ELR
        payload.timeSeconds = prevSnapshot.elr > 0 ? payload.amount / prevSnapshot.elr : 0;

        return {
            ...action,
            payload,
        };
    }

    return action;
}

/**
 * Calculate the duration of an action in seconds.
 */
export function getActionDuration(
    action: Action,
    prevSnapshot: Pick<CalculationsSnapshot, 'offlineEarnings'>
): number {
    if (
        action.type === 'store_fuel' ||
        action.type === 'wait_for_te'
    ) {
        return (action.payload as any).timeSeconds || 0;
    }

    if (
        action.type === 'launch_missions' ||
        action.type === 'wait_for_missions' ||
        action.type === 'wait_for_sleep'
    ) {
        return (action.payload as any).totalTimeSeconds || 0;
    }

    const GEM_COSTING_TYPES = [
        'buy_research',
        'buy_hab',
        'buy_vehicle',
        'buy_train_car',
        'buy_silo',
    ];

    if (GEM_COSTING_TYPES.includes(action.type) && action.cost > 0 && prevSnapshot.offlineEarnings > 0) {
        // Cost-based actions: duration = cost / offlineEarnings
        return action.cost / prevSnapshot.offlineEarnings;
    }

    return 0;
}

/**
 * Calculate the number of eggs passively delivered during an action's duration.
 * During any action that takes time, the farm continues shipping eggs at the ELR.
 *
 * Excluded:
 * - store_fuel: eggs go to fuel tank, not regular delivery (already tracked separately)
 * - wait_for_te: already explicitly tracks eggs delivered via eggsToLay
 * - start_ascension, shift, change_artifacts: no meaningful duration
 *
 * Returns the number of eggs passively delivered, or 0 if not applicable.
 */
export function computePassiveEggsDelivered(
    action: Action,
    prevSnapshot: Pick<CalculationsSnapshot, 'elr' | 'offlineEarnings'>
): number {
    // These action types handle their own egg delivery or have no duration
    if (
        action.type === 'store_fuel' ||
        action.type === 'wait_for_te' ||
        action.type === 'start_ascension' ||
        action.type === 'shift' ||
        action.type === 'change_artifacts' ||
        action.type === 'toggle_sale' ||
        action.type === 'equip_artifact_set' ||
        action.type === 'update_artifact_set'
    ) {
        return 0;
    }

    const durationSeconds = getActionDuration(action, prevSnapshot);

    if (durationSeconds > 0 && prevSnapshot.elr > 0) {
        return prevSnapshot.elr * durationSeconds;
    }

    return 0;
}

/**
 * Apply passive egg delivery to an engine state.
 * Returns a new state with updated eggsDelivered if applicable.
 */
export function applyPassiveEggs(state: EngineState, passiveEggs: number): EngineState {
    if (passiveEggs <= 0) return state;

    const egg = state.currentEgg;
    return {
        ...state,
        eggsDelivered: {
            ...state.eggsDelivered,
            [egg]: (state.eggsDelivered[egg] || 0) + passiveEggs,
        },
    };
}

/**
 * Purely apply an action to the engine state.
 * Returns a new state object (shallow copy with structural sharing).
 * Does NOT mutate the input state.
 */
export function applyAction(state: EngineState, action: Action): EngineState {
    switch (action.type) {
        case 'start_ascension': {
            const payload = action.payload as StartAscensionPayload;
            const newState = {
                ...state,
                currentEgg: payload.initialEgg,
            };

            // If initial farm state provided, initialize engine state from it
            if (payload.initialFarmState) {
                const farm = payload.initialFarmState;
                newState.researchLevels = { ...farm.commonResearches };
                newState.habIds = [...farm.habs];
                newState.vehicles = [...farm.vehicles];
                newState.siloCount = farm.numSilos;
                newState.population = farm.population;
                newState.lastStepTime = farm.lastStepTime;

                // Note: We DO NOT add farm.deliveredEggs to eggsDelivered here
                // because eggsDelivered in the engine (from initialSnapshot) 
                // already represents the cumulative total from the backup.
            }

            // Note: We DO NOT recalculate te or teEarned here. 
            // They remain at their initial claimed values from the player backup.
            // Pending TE gained during the ascension do not contribute to the multiplier.

            return newState;
        }

        case 'buy_vehicle': {
            const payload = action.payload as BuyVehiclePayload;
            const newVehicles = [...state.vehicles];
            // Ensure array is large enough (though it should be initialized)
            while (newVehicles.length <= payload.slotIndex) {
                newVehicles.push({ vehicleId: null, trainLength: 1 });
            }
            newVehicles[payload.slotIndex] = {
                vehicleId: payload.vehicleId,
                trainLength: payload.trainLength || 1,
            };
            return { ...state, vehicles: newVehicles };
        }

        case 'buy_hab': {
            const payload = action.payload as BuyHabPayload;
            const newHabs = [...state.habIds];
            while (newHabs.length <= payload.slotIndex) {
                newHabs.push(null);
            }
            newHabs[payload.slotIndex] = payload.habId;
            return { ...state, habIds: newHabs };
        }

        case 'buy_research': {
            const payload = action.payload as BuyResearchPayload;
            return {
                ...state,
                researchLevels: {
                    ...state.researchLevels,
                    [payload.researchId]: payload.toLevel,
                },
            };
        }

        case 'shift': {
            const payload = action.payload as ShiftPayload;
            return {
                ...state,
                currentEgg: payload.toEgg,
                shiftCount: payload.newShiftCount,
            };
        }

        case 'buy_train_car': {
            const payload = action.payload as BuyTrainCarPayload;
            const newVehicles = [...state.vehicles];
            if (newVehicles[payload.slotIndex]) {
                newVehicles[payload.slotIndex] = {
                    ...newVehicles[payload.slotIndex],
                    trainLength: payload.toLength,
                };
            }
            return { ...state, vehicles: newVehicles };
        }

        case 'change_artifacts': {
            const payload = action.payload as ChangeArtifactsPayload;
            return {
                ...state,
                artifactLoadout: payload.toLoadout.map((slot) => ({
                    artifactId: slot.artifactId,
                    stones: [...slot.stones],
                })),
            };
        }

        case 'buy_silo': {
            const payload = action.payload as BuySiloPayload;
            return { ...state, siloCount: payload.toCount };
        }

        case 'store_fuel': {
            const payload = action.payload as StoreFuelPayload;

            // Update fuel amounts
            const newFuelAmounts = { ...state.fuelTankAmounts };
            newFuelAmounts[payload.egg] = (newFuelAmounts[payload.egg] || 0) + payload.amount;

            // Update eggs delivered (shared logic with wait_for_te for Truth Eggs)
            const newEggsDelivered = { ...state.eggsDelivered };
            newEggsDelivered[payload.egg] = (newEggsDelivered[payload.egg] || 0) + payload.amount;

            // Note: We DO NOT update te or teEarned here because shipping eggs 
            // only adds to pending TE, which does not affect IHR/earnings.

            return {
                ...state,
                fuelTankAmounts: newFuelAmounts,
                eggsDelivered: newEggsDelivered,
            };
        }

        case 'wait_for_te': {
            const payload = action.payload as WaitForTEPayload;

            // Update eggs delivered
            const newEggsDelivered = { ...state.eggsDelivered };
            newEggsDelivered[payload.egg] = (newEggsDelivered[payload.egg] || 0) + payload.eggsToLay;

            // Note: We DO NOT update te or teEarned here because shipping eggs 
            // only adds to pending TE, which does not affect IHR/earnings.

            return {
                ...state,
                eggsDelivered: newEggsDelivered,
            };
        }

        case 'launch_missions': {
            const payload = action.payload as LaunchMissionsPayload;
            const newFuelAmounts = { ...state.fuelTankAmounts };
            for (const [egg, amount] of Object.entries(payload.fuelConsumed)) {
                if (amount > 0) {
                    newFuelAmounts[egg as VirtueEgg] = Math.max(0, (newFuelAmounts[egg as VirtueEgg] || 0) - amount);
                }
            }
            return { ...state, fuelTankAmounts: newFuelAmounts };
        }

        case 'toggle_sale': {
            const payload = action.payload as ToggleSalePayload;
            return {
                ...state,
                activeSales: {
                    ...state.activeSales,
                    [payload.saleType]: payload.active,
                },
            };
        }

        case 'equip_artifact_set': {
            const payload = action.payload as import('@/types').EquipArtifactSetPayload;
            const setName = payload.setName;
            const newLoadout = state.artifactSets[setName];

            return {
                ...state,
                activeArtifactSet: setName,
                artifactLoadout: newLoadout ? newLoadout.map(slot => ({
                    artifactId: slot.artifactId,
                    stones: [...slot.stones],
                })) : state.artifactLoadout,
            };
        }

        case 'update_artifact_set': {
            const payload = action.payload as import('@/types').UpdateArtifactSetPayload;
            const setName = payload.setName;
            const newSets = { ...state.artifactSets };
            newSets[setName] = payload.newLoadout.map(slot => ({
                artifactId: slot.artifactId,
                stones: [...slot.stones],
            }));

            const newState = {
                ...state,
                artifactSets: newSets,
            };

            // If updating currently active set, also update current loadout
            if (state.activeArtifactSet === setName) {
                newState.artifactLoadout = payload.newLoadout.map(slot => ({
                    artifactId: slot.artifactId,
                    stones: [...slot.stones],
                }));
            }

            return newState;
        }

        case 'wait_for_sleep': {
            return state;
        }

        // Default case: return state unchanged
        default:
            return state;
    }
}
