import type {
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
    StartAscensionPayload,
} from '@/types';
import type { EngineState } from './types';

/**
 * Purely apply an action to the engine state.
 * Returns a new state object (shallow copy with structural sharing).
 * Does NOT mutate the input state.
 */
export function applyAction(state: EngineState, action: Action): EngineState {
    switch (action.type) {
        case 'start_ascension': {
            const payload = action.payload as StartAscensionPayload;
            return {
                ...state,
                currentEgg: payload.initialEgg,
            };
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

            return {
                ...state,
                te: state.te + payload.teGained,
                eggsDelivered: newEggsDelivered,
            };
        }

        // Default case: return state unchanged
        default:
            return state;
    }
}
