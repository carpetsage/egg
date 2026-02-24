import type {
    ActionPayloadMap,
    ActionType,
    CalculationsSnapshot,
} from './core';
import type { VirtueEgg } from './virtue';
import type { ArtifactSlotPayload } from './artifacts';
import type { VehicleSlot, ResearchLevels } from '../index';

/**
 * Base action interface.
 */
export interface BaseAction {
    id: string;
    index: number;
    timestamp: number;
    type: ActionType;
    cost: number;
    elrDelta: number;
    offlineEarningsDelta: number;
    eggValueDelta: number;
    habCapacityDelta: number;
    layRateDelta: number;
    shippingCapacityDelta: number;
    ihrDelta: number;
    bankDelta: number;
    populationDelta: number;
    endState: CalculationsSnapshot;
    totalTimeSeconds: number;
    dependsOn: string[];
    dependents: string[];
}

/**
 * Typed action with payload.
 */
export type Action<T extends ActionType = ActionType> = BaseAction & {
    type: T;
    payload: ActionPayloadMap[T];
};

/**
 * Result of validating an undo operation.
 */
export interface UndoValidation {
    valid: boolean;
    action?: Action;
    dependentActions: Action[];
    needsRecursiveUndo: boolean;
}

/**
 * Context passed to action executors.
 */
export interface StoreContext {
    habCapacity: {
        setHab(slotIndex: number, habId: number | null): void;
        habIds: (number | null)[];
    };
    shippingCapacity: {
        setVehicle(slotIndex: number, vehicleId: number | null): void;
        setTrainLength(slotIndex: number, length: number): void;
        vehicles: VehicleSlot[];
    };
    commonResearch: {
        setResearchLevel(researchId: string, level: number): void;
        researchLevels: ResearchLevels;
    };
    costModifiers: {
        habCostMultiplier: number;
        vehicleCostMultiplier: number;
        researchCostMultiplier: number;
    };
}

/**
 * Helper to generate action ID.
 */
export function generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper to create empty undo validation.
 */
export function createEmptyUndoValidation(): UndoValidation {
    return {
        valid: false,
        dependentActions: [],
        needsRecursiveUndo: false,
    };
}

/**
 * Helper to create empty calculations snapshot.
 */
export function createEmptySnapshot(): CalculationsSnapshot {
    return {
        eggValue: 0,
        habCapacity: 0,
        elr: 0,
        shippingCapacity: 0,
        layRate: 0,
        onlineEarnings: 0,
        offlineEarnings: 0,
        onlineIHR: 0,
        offlineIHR: 0,
        ratePerChickenPerSecond: 0,
        bankValue: 0,
        currentEgg: 'curiosity',
        shiftCount: 0,
        te: 0,
        soulEggs: 0,
        siloCount: 1,
        siloTimeMinutes: 60,
        fuelTankAmounts: {
            curiosity: 0,
            integrity: 0,
            humility: 0,
            resilience: 0,
            kindness: 0,
        },
        eggsDelivered: {
            curiosity: 0,
            integrity: 0,
            humility: 0,
            resilience: 0,
            kindness: 0,
        },
        teEarned: {
            curiosity: 0,
            integrity: 0,
            humility: 0,
            resilience: 0,
            kindness: 0,
        },
        population: 1,
        lastStepTime: 0,
        vehicles: [{ vehicleId: 0, trainLength: 1 }],
        habIds: [0, null, null, null],
        researchLevels: {},
        artifactLoadout: [
            { artifactId: null, stones: [] },
            { artifactId: null, stones: [] },
            { artifactId: null, stones: [] },
            { artifactId: null, stones: [] },
        ],
        activeArtifactSet: null,
        artifactSets: {
            earnings: null,
            elr: null,
        },
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
