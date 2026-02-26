import {
    Action,
    CalculationsSnapshot,
    LaunchMissionsPayload,
    WaitForTEPayload,
    StoreFuelPayload,
} from '@/types';
import { solveForTime, getTimeToSave, calculateEggsDeliveredForTime } from './math';
import { eggsNeededForTE, countTEThresholdsPassed } from '@/lib/truthEggs';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getResearchById, getDiscountedVirtuePrice } from '@/calculations/commonResearch';
import { getHabById, getDiscountedHabPrice, countHabsOfType } from '@/lib/habs';
import { getDiscountedVehiclePrice, countVehiclesOfType, getDiscountedTrainCarPrice } from '@/lib/vehicles';
import { nextSiloCost } from '@/stores/silos';
import type { SimulationContext } from '../types';

/**
 * Recalculate an action's payload based on the state before it executes.
 */
export function refreshActionPayload(
    action: Action,
    prevSnapshot: CalculationsSnapshot,
    context?: SimulationContext
): Action {
    if (context) {
        if (action.type === 'buy_research') {
            const payload = action.payload as import('@/types').BuyResearchPayload;
            const artifactMods = calculateArtifactModifiers(prevSnapshot.artifactLoadout);
            const modifiers = {
                labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
                waterballoonMultiplier: context.colleggtibleModifiers.researchCost || 1,
                puzzleCubeMultiplier: artifactMods.researchCost.totalMultiplier
            };
            const research = getResearchById(payload.researchId);
            if (research) {
                const refreshedCost = getDiscountedVirtuePrice(research, payload.fromLevel, modifiers, prevSnapshot.activeSales.research);
                if (action.cost !== refreshedCost) action = { ...action, cost: refreshedCost };
            }
        } else if (action.type === 'buy_hab') {
            const payload = action.payload as import('@/types').BuyHabPayload;
            const modifiers = {
                cheaperContractorsLevel: context.epicResearchLevels['cheaper_contractors'] || 0,
                flameRetardantMultiplier: context.colleggtibleModifiers.habCost || 1
            };
            const hab = getHabById(payload.habId as any);
            if (hab) {
                const habIds = prevSnapshot.habIds.slice(0, payload.slotIndex);
                const purchaseIndex = countHabsOfType(habIds, payload.habId);
                const refreshedCost = getDiscountedHabPrice(hab, purchaseIndex, modifiers, prevSnapshot.activeSales.hab);
                if (action.cost !== refreshedCost) action = { ...action, cost: refreshedCost };
            }
        } else if (action.type === 'buy_vehicle') {
            const payload = action.payload as import('@/types').BuyVehiclePayload;
            const modifiers = {
                bustUnionsLevel: context.epicResearchLevels['bust_unions'] || 0,
                lithiumMultiplier: context.colleggtibleModifiers.vehicleCost || 1
            };
            const vehicles = prevSnapshot.vehicles.slice(0, payload.slotIndex);
            const purchaseIndex = countVehiclesOfType(vehicles as any, payload.vehicleId);
            const refreshedCost = getDiscountedVehiclePrice(payload.vehicleId, purchaseIndex, modifiers, prevSnapshot.activeSales.vehicle);
            if (action.cost !== refreshedCost) action = { ...action, cost: refreshedCost };
        } else if (action.type === 'buy_train_car') {
            const payload = action.payload as import('@/types').BuyTrainCarPayload;
            const modifiers = {
                bustUnionsLevel: context.epicResearchLevels['bust_unions'] || 0,
                lithiumMultiplier: context.colleggtibleModifiers.vehicleCost || 1
            };
            const carIndex = payload.toLength - 1;
            const refreshedCost = getDiscountedTrainCarPrice(carIndex, modifiers, prevSnapshot.activeSales.vehicle);
            if (action.cost !== refreshedCost) action = { ...action, cost: refreshedCost };
        } else if (action.type === 'buy_silo') {
            const payload = action.payload as import('@/types').BuySiloPayload;
            const refreshedCost = nextSiloCost(payload.fromCount);
            if (action.cost !== refreshedCost) action = { ...action, cost: refreshedCost };
        }
    }

    if (action.type === 'wait_for_te') {
        const payload = { ...action.payload as WaitForTEPayload };
        const egg = payload.egg;
        const currentDelivered = prevSnapshot.eggsDelivered[egg] || 0;
        payload.eggsToLay = eggsNeededForTE(currentDelivered, payload.targetTE);
        payload.timeSeconds = solveForTime(
            payload.eggsToLay,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity,
            prevSnapshot.habCapacity
        );
        payload.startEggsDelivered = currentDelivered;
        payload.startTE = countTEThresholdsPassed(currentDelivered);
        payload.teGained = Math.max(0, payload.targetTE - payload.startTE);
        return { ...action, payload };
    }

    if (action.type === 'store_fuel') {
        const payload = { ...action.payload as StoreFuelPayload };
        payload.timeSeconds = solveForTime(
            payload.amount,
            prevSnapshot.population,
            prevSnapshot.offlineIHR / 60,
            prevSnapshot.ratePerChickenPerSecond,
            prevSnapshot.shippingCapacity,
            prevSnapshot.habCapacity
        );
        return { ...action, payload };
    }

    if (action.type === 'wait_for_missions') {
        const payload = { ...action.payload as import('@/types').WaitForMissionsPayload };
        const maxReturn = Math.max(...payload.missions.map(m => m.returnTimestamp || 0));
        payload.totalTimeSeconds = Math.max(0, maxReturn - prevSnapshot.lastStepTime);
        return { ...action, payload };
    }

    if (action.type === 'wait_for_full_habs') {
        const payload = { ...action.payload as import('@/types').WaitForFullHabsPayload };
        payload.habCapacity = prevSnapshot.habCapacity;
        payload.currentPopulation = prevSnapshot.population;
        payload.ihr = prevSnapshot.offlineIHR;
        const chickensNeeded = Math.max(0, payload.habCapacity - payload.currentPopulation);
        payload.totalTimeSeconds = payload.ihr > 0 ? (chickensNeeded / (payload.ihr / 60)) : 0;
        return { ...action, payload };
    }

    return action;
}

/**
 * Calculate the duration of an action in seconds.
 */
export function getActionDuration(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): number {
    if (action.type === 'store_fuel' || action.type === 'wait_for_te') {
        return (action.payload as any).timeSeconds || 0;
    }

    if (
        action.type === 'wait_for_missions' ||
        action.type === 'wait_for_time' ||
        action.type === 'wait_for_full_habs'
    ) {
        return (action.payload as any).totalTimeSeconds || 0;
    }

    if (action.type === 'launch_missions') {
        const T = action.cost > 0 ? getTimeToSave(action.cost, prevSnapshot) : 0;
        return T + ((action.payload as LaunchMissionsPayload).totalTimeSeconds || 0);
    }

    const GEM_COSTING_TYPES = ['buy_research', 'buy_hab', 'buy_vehicle', 'buy_train_car', 'buy_silo'];
    if (GEM_COSTING_TYPES.includes(action.type) && action.cost > 0) {
        return getTimeToSave(action.cost, prevSnapshot);
    }

    return 0;
}

/**
 * Calculate the number of eggs passively delivered during an action's duration.
 */
export function computePassiveEggsDelivered(
    action: Action,
    prevSnapshot: CalculationsSnapshot
): number {
    const NO_PASSIVE_TYPES = [
        'store_fuel', 'wait_for_te', 'start_ascension', 'shift', 'change_artifacts',
        'toggle_sale', 'equip_artifact_set', 'update_artifact_set', 'remove_fuel',
        'toggle_earnings_boost', 'notification'
    ];
    if (NO_PASSIVE_TYPES.includes(action.type)) return 0;

    const durationSeconds = getActionDuration(action, prevSnapshot);
    if (durationSeconds > 0) {
        return calculateEggsDeliveredForTime(durationSeconds, prevSnapshot);
    }
    return 0;
}
