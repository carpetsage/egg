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
 * Solve for time T in: integral from 0 to T of min(R * (P0 + I*t), S) dt = targetAmount
 */
export function solveForTime(targetAmount: number, P0: number, I: number, R: number, S: number): number {
    if (targetAmount <= 0) return 0;

    // 1. If already shipping limited
    if (R * P0 >= S) {
        return S > 0 ? targetAmount / S : Infinity;
    }

    // 2. Laying limited (at least initially)
    const Tship = (S / R - P0) / I;
    // Cumulative amount at Tship: Integral of R * (P0 + I*t) dt from 0 to Tship
    const Gship = (I > 0 && Tship !== Infinity) ? (R * (P0 * Tship + 0.5 * I * Tship * Tship)) : Infinity;

    if (targetAmount <= Gship) {
        // Solves 0.5*(RI)T^2 + (RP0)T - targetAmount = 0
        const a = 0.5 * R * I;
        const b = R * P0;
        const c = -targetAmount;

        if (a === 0) { // No growth (I=0 or R=0)
            return b > 0 ? targetAmount / b : Infinity;
        }

        return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    } else {
        // Reaches shipping limit first
        const Tremaining = (targetAmount - Gship) / S;
        return Tship + Tremaining;
    }
}

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

        // Recalculate time based on new eggsToLay and current growth
        payload.timeSeconds = solveForTime(
            payload.eggsToLay,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity
        );

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

        // Recalculate time based on fixed amount and current growth
        payload.timeSeconds = solveForTime(
            payload.amount,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity
        );

        return {
            ...action,
            payload,
        };
    }

    if (action.type === 'wait_for_missions') {
        const payload = { ...action.payload as import('@/types').WaitForMissionsPayload };
        const maxReturn = Math.max(...payload.missions.map(m => m.returnTimestamp || 0));
        payload.totalTimeSeconds = Math.max(0, maxReturn - prevSnapshot.lastStepTime);
        return {
            ...action,
            payload,
        };
    }

    if (action.type === 'wait_for_full_habs') {
        const payload = { ...action.payload as import('@/types').WaitForFullHabsPayload };
        payload.habCapacity = prevSnapshot.habCapacity;
        payload.currentPopulation = prevSnapshot.population;
        payload.ihr = prevSnapshot.offlineIHR;
        const chickensNeeded = Math.max(0, payload.habCapacity - payload.currentPopulation);
        payload.totalTimeSeconds = payload.ihr > 0 ? (chickensNeeded / (payload.ihr / 60)) : 0;
        return {
            ...action,
            payload,
        };
    }

    return action;
}

/**
 * Calculate the total earnings integrated over a period of time [0, seconds].
 * earnings = integral from 0 to T of V * min(R * (P0 + I*t), S) dt
 */
export function calculateEarningsForTime(seconds: number, prevSnapshot: CalculationsSnapshot): number {
    if (seconds <= 0) return 0;

    const P0 = prevSnapshot.population;
    const I = prevSnapshot.offlineIHR / 60;
    const R = prevSnapshot.ratePerChickenPerSecond;
    const S = prevSnapshot.shippingCapacity;
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;

    if (V <= 0) return 0;

    let Tship = Infinity;
    if (I > 0) {
        Tship = (S / R - P0) / I;
    } else if (R * P0 >= S) {
        Tship = 0;
    }

    if (Tship <= 0) {
        return V * S * seconds;
    } else if (seconds <= Tship) {
        return V * R * (P0 * seconds + 0.5 * I * seconds * seconds);
    } else {
        const Gship = V * R * (P0 * Tship + 0.5 * I * Tship * Tship);
        const Gafter = V * S * (seconds - Tship);
        return Gship + Gafter;
    }
}

/**
 * Helper to get time to save for a cost, accounting for population growth.
 */
export function getTimeToSave(cost: number, prevSnapshot: CalculationsSnapshot): number {
    const effectiveCost = Math.max(0, cost - (prevSnapshot.bankValue || 0));
    if (effectiveCost <= 0) return 0;

    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    if (V <= 0) return Infinity;

    return solveForTime(
        effectiveCost / V,
        prevSnapshot.population,
        prevSnapshot.offlineIHR / 60,
        prevSnapshot.ratePerChickenPerSecond,
        prevSnapshot.shippingCapacity
    );
}

/**
 * Calculate the duration of an action in seconds.
 */
export function getActionDuration(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): number {
    if (
        action.type === 'store_fuel' ||
        action.type === 'wait_for_te'
    ) {
        return (action.payload as any).timeSeconds || 0;
    }

    if (
        action.type === 'wait_for_missions' ||
        action.type === 'wait_for_time' ||
        action.type === 'wait_for_full_habs'
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

    if (action.type === 'launch_missions') {
        const T = action.cost > 0 ? getTimeToSave(action.cost, prevSnapshot) : 0;
        return T + ((action.payload as LaunchMissionsPayload).totalTimeSeconds || 0);
    }

    if (GEM_COSTING_TYPES.includes(action.type) && action.cost > 0) {
        return getTimeToSave(action.cost, prevSnapshot);
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
    prevSnapshot: CalculationsSnapshot
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
        action.type === 'update_artifact_set' ||
        action.type === 'remove_fuel' ||
        action.type === 'toggle_earnings_boost' ||
        action.type === 'notification'
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
 * Advance the simulation time in the engine state and add earned gems to the bank.
 * Also advances population based on growth rate.
 */
export function applyTime(
    state: EngineState,
    seconds: number,
    prevSnapshot: CalculationsSnapshot,
    skipBankUpdate: boolean = false
): EngineState {
    if (seconds <= 0) return state;

    const P0 = prevSnapshot.population;
    const I = prevSnapshot.offlineIHR / 60;
    const R = prevSnapshot.ratePerChickenPerSecond;
    const S = prevSnapshot.shippingCapacity;
    const V = prevSnapshot.elr > 0 ? prevSnapshot.offlineEarnings / prevSnapshot.elr : 0;
    const maxPop = prevSnapshot.habCapacity;

    // 1. Advance population
    const newPop = Math.min(maxPop, P0 + I * seconds);

    // 2. Calculate earned gems using integral (average earnings)
    let earnedGems = 0;
    if (V > 0 && !skipBankUpdate) {
        let Tship = Infinity;
        if (I > 0) {
            Tship = (S / R - P0) / I;
        } else if (R * P0 >= S) {
            Tship = 0;
        }

        if (Tship <= 0) {
            // Already shipping-limited from the start
            earnedGems = V * S * seconds;
        } else if (seconds <= Tship) {
            // Entirely in laying-limited phase (or shipping never reached)
            earnedGems = V * R * (P0 * seconds + 0.5 * I * seconds * seconds);
        } else {
            // Crosses into shipping-limited phase
            const Gship = V * R * (P0 * Tship + 0.5 * I * Tship * Tship);
            const Gafter = V * S * (seconds - Tship);
            earnedGems = Gship + Gafter;
        }
    }

    let newBankValue = (state.bankValue || 0) + earnedGems;

    // Normalize rounding errors: if bank is extremely small relative to current earnings rate, zero it out.
    // This happens when buying things one-at-a-time where cost and bank are nearly identical.
    if (prevSnapshot.offlineEarnings > 0) {
        if (Math.abs(newBankValue) < prevSnapshot.offlineEarnings * 1e-6) {
            newBankValue = 0;
        }
    }

    return {
        ...state,
        population: newPop,
        lastStepTime: (state.lastStepTime || 0) + seconds,
        bankValue: newBankValue,
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
                newState.bankValue = farm.cashEarned - farm.cashSpent;

                // Note: We DO NOT add farm.deliveredEggs to eggsDelivered here
                // because eggsDelivered in the engine (from initialSnapshot) 
                // already represents the cumulative total from the backup.
            } else {
                newState.bankValue = 0;
                newState.population = 1; // Start with 1 chicken (first tap)
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
            return {
                ...state,
                vehicles: newVehicles,
                bankValue: (state.bankValue || 0) - action.cost,
            };
        }

        case 'buy_hab': {
            const payload = action.payload as BuyHabPayload;
            const newHabs = [...state.habIds];
            while (newHabs.length <= payload.slotIndex) {
                newHabs.push(null);
            }
            newHabs[payload.slotIndex] = payload.habId;
            return {
                ...state,
                habIds: newHabs,
                bankValue: (state.bankValue || 0) - action.cost,
            };
        }

        case 'buy_research': {
            const payload = action.payload as BuyResearchPayload;
            return {
                ...state,
                researchLevels: {
                    ...state.researchLevels,
                    [payload.researchId]: payload.toLevel,
                },
                bankValue: (state.bankValue || 0) - action.cost,
            };
        }

        case 'shift': {
            const payload = action.payload as ShiftPayload;
            return {
                ...state,
                currentEgg: payload.toEgg,
                shiftCount: payload.newShiftCount,
                bankValue: 0,
                population: 1, // Start with 1 chicken on shift
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
            return {
                ...state,
                vehicles: newVehicles,
                bankValue: (state.bankValue || 0) - action.cost,
            };
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
            return {
                ...state,
                siloCount: payload.toCount,
                bankValue: (state.bankValue || 0) - action.cost,
            };
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

        case 'remove_fuel': {
            const payload = action.payload as import('@/types').RemoveFuelPayload;
            const newFuelAmounts = { ...state.fuelTankAmounts };
            newFuelAmounts[payload.egg] = Math.max(0, (newFuelAmounts[payload.egg] || 0) - payload.amount);
            return {
                ...state,
                fuelTankAmounts: newFuelAmounts,
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
            return {
                ...state,
                fuelTankAmounts: newFuelAmounts,
                bankValue: (state.bankValue || 0) - action.cost,
            };
        }

        case 'toggle_sale': {
            const payload = action.payload as ToggleSalePayload;
            return {
                ...state,
                activeSales: {
                    ...state.activeSales,
                    [payload.saleType]: payload.active,
                }
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

        case 'wait_for_time': {
            return state;
        }

        case 'wait_for_full_habs': {
            // Logic handled by applyTime which advances population based on duration
            return state;
        }

        case 'toggle_earnings_boost': {
            const payload = action.payload as import('@/types').ToggleEarningsBoostPayload;
            return {
                ...state,
                earningsBoost: {
                    active: payload.active,
                    multiplier: payload.multiplier,
                },
            };
        }

        case 'notification': {
            return state; // Notifications don't change state
        }

        // Default case: return state unchanged
        default:
            return state;
    }
}
