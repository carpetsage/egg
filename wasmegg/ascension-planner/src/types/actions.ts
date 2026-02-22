/**
 * Action System Types
 *
 * EXTENSION GUIDE FOR CLAUDE:
 * To add a new action type:
 * 1. Add to ActionType union below
 * 2. Add payload interface (e.g., NewActionPayload)
 * 3. Add to ActionPayloadMap
 * 4. Add executor in src/lib/actions/executors/<type>.ts
 * 5. Add dependency rules in src/lib/actions/executor.ts computeDependencies()
 * 6. Add UI in src/components/actions/<Type>Actions.vue
 */

import type {
  EggValueOutput,
  HabCapacityOutput,
  LayRateOutput,
  ShippingCapacityOutput,
  EffectiveLayRateOutput,
  EarningsOutput,
  IHROutput,
  VehicleSlot,
  ResearchLevels,
} from './index';

// ============================================================================
// Virtue Eggs
// ============================================================================

/**
 * The five virtue eggs available during ascension.
 */
export type VirtueEgg = 'curiosity' | 'integrity' | 'kindness' | 'resilience' | 'humility';

/**
 * Display names for virtue eggs.
 */
export const VIRTUE_EGG_NAMES: Record<VirtueEgg, string> = {
  curiosity: 'Curiosity',
  integrity: 'Integrity',
  kindness: 'Kindness',
  resilience: 'Resilience',
  humility: 'Humility',
};

/**
 * All virtue eggs in order.
 */
export const VIRTUE_EGGS: VirtueEgg[] = ['curiosity', 'integrity', 'humility', 'resilience', 'kindness'];

// ============================================================================
// Artifact Sets
// ============================================================================

/**
 * Valid names for artifact sets.
 */
export type ArtifactSetName = 'earnings' | 'elr';

/**
 * Union of all action types.
 * Add new action types here when extending the system.
 */
export type ActionType = 'start_ascension' | 'buy_vehicle' | 'buy_hab' | 'buy_research' | 'shift' | 'buy_train_car' | 'change_artifacts' | 'buy_silo' | 'store_fuel' | 'remove_fuel' | 'wait_for_te' | 'launch_missions' | 'toggle_sale' | 'equip_artifact_set' | 'update_artifact_set' | 'wait_for_missions' | 'wait_for_time' | 'wait_for_full_habs' | 'toggle_earnings_boost' | 'notification';

// ============================================================================
// Action Payloads
// ============================================================================

/**
 * Payload for buying/upgrading a vehicle in a specific slot.
 */
export interface BuyVehiclePayload {
  slotIndex: number;
  vehicleId: number;
  trainLength?: number; // For hyperloop, defaults to 1
}

/**
 * Payload for buying/upgrading a hab in a specific slot.
 */
export interface BuyHabPayload {
  slotIndex: number;
  habId: number;
}

/**
 * Payload for buying one level of research.
 */
export interface BuyResearchPayload {
  researchId: string;
  fromLevel: number;
  toLevel: number;
}

/**
 * Payload for starting an ascension (initial state).
 * This is the first action and cannot be undone.
 */
export interface StartAscensionPayload {
  initialEgg: VirtueEgg; // The egg chosen to start the ascension
  initialFarmState?: import('./index').CurrentFarmState;
}

/**
 * Payload for shifting to a different virtue egg.
 */
export interface ShiftPayload {
  fromEgg: VirtueEgg;
  toEgg: VirtueEgg;
  newShiftCount: number; // The shift count after this shift
}

/**
 * Payload for buying a train car for a hyperloop train.
 */
export interface BuyTrainCarPayload {
  slotIndex: number;     // Which vehicle slot has the hyperloop
  fromLength: number;    // Train length before this purchase
  toLength: number;      // Train length after this purchase
}

/**
 * Artifact slot in a loadout (serializable).
 */
export interface ArtifactSlotPayload {
  artifactId: string | null;
  stones: (string | null)[];
}

/**
 * Payload for changing artifact loadout.
 */
export interface ChangeArtifactsPayload {
  fromLoadout: ArtifactSlotPayload[];
  toLoadout: ArtifactSlotPayload[];
}

/**
 * Payload for equipping an artifact set.
 */
export interface EquipArtifactSetPayload {
  setName: ArtifactSetName;
}

/**
 * Payload for updating an artifact set.
 */
export interface UpdateArtifactSetPayload {
  setName: ArtifactSetName;
  newLoadout: ArtifactSlotPayload[];
}

/**
 * Payload for buying a silo.
 */
export interface BuySiloPayload {
  fromCount: number; // Silos owned before purchase
  toCount: number;   // Silos owned after purchase
}

/**
 * Payload for storing eggs in the fuel tank.
 */
export interface StoreFuelPayload {
  egg: VirtueEgg;       // Which virtue egg to store
  amount: number;       // Number of eggs to store
  timeSeconds: number;  // Time required (for display)
}

/**
 * Payload for removing eggs from the fuel tank.
 */
export interface RemoveFuelPayload {
  egg: VirtueEgg;       // Which virtue egg to remove
  amount: number;       // Number of eggs to remove
}

/**
 * Payload for waiting to accumulate Truth Eggs (TE).
 */
export interface WaitForTEPayload {
  egg: VirtueEgg;         // Which virtue egg
  targetTE: number;       // Target TE number (1-98)
  teGained: number;       // How many TE gained in this action
  eggsToLay: number;      // Eggs to lay to reach target
  timeSeconds: number;    // Time required
  startEggsDelivered: number; // Eggs delivered before this action
  startTE: number;            // TE thresholds passed before this action
}

/**
 * A single mission type entry in a launch_missions payload.
 */
export interface LaunchMissionEntry {
  ship: number;       // Spaceship enum value
  duration: number;   // DurationType enum value
  count: number;
}

/**
 * Payload for launching rocket missions.
 */
export interface LaunchMissionsPayload {
  missions: LaunchMissionEntry[];
  totalTimeSeconds: number;
  totalMissions: number;
  fuelConsumed: Record<VirtueEgg, number>;
}

/**
 * Information about an active mission from the backup.
 */
export interface ActiveMissionInfo {
  ship: number;       // Spaceship enum value
  duration: number;   // DurationType enum value
  shipName: string;
  durationTypeName: string;
  shipIconPath: string;
  sensorTarget: string | null;
  returnTimestamp: number | null; // Unix timestamp in seconds
  statusIsFueling: boolean;
  statusName: string;
  capacity: number;
  fuels: {
    egg: number;
    amount: number;
    eggIconPath: string;
  }[];
}

/**
 * Payload for waiting for active missions to return.
 */
export interface WaitForMissionsPayload {
  missions: ActiveMissionInfo[];
  totalTimeSeconds: number;
}

/**
 * Payload for waiting for a fixed amount of time.
 */
export interface WaitForTimePayload {
  totalTimeSeconds: number;
}

/**
 * Payload for waiting for habs to fill.
 */
export interface WaitForFullHabsPayload {
  habCapacity: number;
  ihr: number;
  currentPopulation: number;
  totalTimeSeconds: number;
}

/**
 * Sale types for toggle_sale action.
 */
export type SaleType = 'research' | 'hab' | 'vehicle';

/**
 * Payload for toggling a sale on or off.
 */
export interface ToggleSalePayload {
  saleType: SaleType;
  active: boolean;
  multiplier: number;
}

/**
 * Payload for toggling earnings boost.
 */
export interface ToggleEarningsBoostPayload {
  active: boolean;
  multiplier: number;
  eventId?: string;
}

/**
 * Payload for generic notifications or markers in history.
 */
export interface NotificationPayload {
  message: string;
  submessage?: string;
  icon?: string;
}

/**
 * Maps action types to their payload interfaces.
 * Add new mappings here when adding action types.
 */
export interface ActionPayloadMap {
  start_ascension: StartAscensionPayload;
  buy_vehicle: BuyVehiclePayload;
  buy_hab: BuyHabPayload;
  buy_research: BuyResearchPayload;
  shift: ShiftPayload;
  buy_train_car: BuyTrainCarPayload;
  change_artifacts: ChangeArtifactsPayload;
  buy_silo: BuySiloPayload;
  store_fuel: StoreFuelPayload;
  remove_fuel: RemoveFuelPayload;
  wait_for_te: WaitForTEPayload;
  launch_missions: LaunchMissionsPayload;
  toggle_sale: ToggleSalePayload;
  equip_artifact_set: EquipArtifactSetPayload;
  update_artifact_set: UpdateArtifactSetPayload;
  wait_for_missions: WaitForMissionsPayload;
  wait_for_time: WaitForTimePayload;
  wait_for_full_habs: WaitForFullHabsPayload;
  toggle_earnings_boost: ToggleEarningsBoostPayload;
  notification: NotificationPayload;
}

// ============================================================================
// Calculations Snapshot
// ============================================================================

/**
 * Snapshot of all calculation outputs at a point in time.
 * Stored with each action to show state after that action.
 */
export interface CalculationsSnapshot {
  // Key metrics (always stored)
  eggValue: number;
  habCapacity: number;
  elr: number;
  shippingCapacity: number;
  layRate: number;
  onlineEarnings: number;
  offlineEarnings: number;
  onlineIHR: number;
  offlineIHR: number;


  // Virtue state
  currentEgg: VirtueEgg;
  shiftCount: number;
  te: number;
  soulEggs: number;

  // Silo state
  siloCount: number;
  siloTimeMinutes: number; // Total away time in minutes

  // Fuel tank state
  fuelTankAmounts: Record<VirtueEgg, number>;

  // Truth Eggs state (per-egg)
  eggsDelivered: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;

  // Farm state
  population: number;
  lastStepTime: number;

  // Store state for reconstruction
  vehicles: VehicleSlot[];
  habIds: (number | null)[];
  researchLevels: ResearchLevels;
  artifactLoadout: ArtifactSlotPayload[];
  activeArtifactSet: ArtifactSetName | null;
  artifactSets: Record<ArtifactSetName, ArtifactSlotPayload[] | null>;

  // Active sales state
  activeSales: {
    research: boolean;
    hab: boolean;
    vehicle: boolean;
  };
  earningsBoost: {
    active: boolean;
    multiplier: number;
  };

  // Full outputs for modal display (computed on-demand, not stored)
  fullOutputs?: CalculationsFullOutputs;
}

/**
 * Full calculation outputs for detailed modal display.
 */
export interface CalculationsFullOutputs {
  eggValue: EggValueOutput;
  habCapacity: HabCapacityOutput;
  layRate: LayRateOutput;
  shippingCapacity: ShippingCapacityOutput;
  elr: EffectiveLayRateOutput;
  earnings: EarningsOutput;
  ihr: IHROutput;
}

// ============================================================================
// Action Interface
// ============================================================================

/**
 * Base action interface - all actions have these fields.
 */
export interface BaseAction {
  id: string;       // Unique ID (uuid)
  index: number;    // Position in action history (0-based)
  timestamp: number; // When action was taken (Unix ms)
  type: ActionType;
  cost: number;     // Virtue gems spent

  // Computed after action executes
  elrDelta: number;              // Change in ELR (eggs/sec) vs previous
  offlineEarningsDelta: number;  // Change in offline earnings ($/sec) vs previous
  eggValueDelta: number;         // Change in egg value
  habCapacityDelta: number;      // Change in hab capacity
  layRateDelta: number;          // Change in lay rate
  shippingCapacityDelta: number; // Change in shipping capacity
  ihrDelta: number;              // Change in IHR (offline)

  // Snapshot of full state AFTER this action
  endState: CalculationsSnapshot;

  totalTimeSeconds: number; // Total time spent saving for or executing this action

  // Dependency tracking for smart undo
  dependsOn: string[];   // Action IDs this action depends on
  dependents: string[];  // Action IDs that depend on this action
}

/**
 * Typed action with payload.
 * Use Action<'buy_vehicle'> for specific typing.
 */
export type Action<T extends ActionType = ActionType> = BaseAction & {
  type: T;
  payload: ActionPayloadMap[T];
};

// ============================================================================
// Undo Validation
// ============================================================================

/**
 * Result of validating an undo operation.
 */
export interface UndoValidation {
  valid: boolean;
  action?: Action;
  dependentActions: Action[];
  needsRecursiveUndo: boolean;
}

// ============================================================================
// Store Context for Executors
// ============================================================================

/**
 * Context passed to action executors with access to all stores.
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for an action.
 */
export function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an empty undo validation result.
 */
export function createEmptyUndoValidation(): UndoValidation {
  return {
    valid: false,
    dependentActions: [],
    needsRecursiveUndo: false,
  };
}

/**
 * Create an empty calculations snapshot.
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

    currentEgg: 'curiosity', // Default starting egg
    shiftCount: 0,
    te: 0,
    soulEggs: 0,
    siloCount: 1, // Everyone starts with 1 silo for free
    siloTimeMinutes: 60, // 1 hour base (without silo capacity research)
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
    population: 0,
    lastStepTime: 0,
    vehicles: [{ vehicleId: 0, trainLength: 1 }], // Every player starts with 1 trike
    habIds: [0, null, null, null], // Every player starts with 1 Coop (id=0)
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
