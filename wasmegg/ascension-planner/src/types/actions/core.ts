import type { VirtueEgg } from './virtue';
import type { ArtifactSlotPayload, ArtifactSetName } from './artifacts';

/**
 * Payload for starting an ascension (initial state).
 */
export interface StartAscensionPayload {
  initialEgg: VirtueEgg;
  initialFarmState?: import('../index').CurrentFarmState;
  isQuickContinue?: boolean;
}

/**
 * Payload for shifting to a different virtue egg.
 */
export interface ShiftPayload {
  fromEgg: VirtueEgg;
  toEgg: VirtueEgg;
  newShiftCount: number;
}

/**
 * Payload for generic notifications or markers in history.
 */
export interface NotificationPayload {
  message: string;
  submessage?: string;
  icon?: string;
}

import type {
  BuyVehiclePayload,
  BuyHabPayload,
  BuyTrainCarPayload,
  BuySiloPayload,
  StoreFuelPayload,
  RemoveFuelPayload,
} from './infrastructure';
import type { BuyResearchPayload, ToggleSalePayload, ToggleEarningsBoostPayload } from './research';
import type { LaunchMissionsPayload, WaitForMissionsPayload } from './missions';
import type { WaitForTEPayload, WaitForTimePayload, WaitForFullHabsPayload } from './wait';
import type {
  EggValueOutput,
  HabCapacityOutput,
  LayRateOutput,
  ShippingCapacityOutput,
  EffectiveLayRateOutput,
  EarningsOutput,
  IHROutput,
} from '../index';

/**
 * Union of all action types.
 */
export type ActionType =
  | 'start_ascension'
  | 'buy_vehicle'
  | 'buy_hab'
  | 'buy_research'
  | 'shift'
  | 'buy_train_car'
  | 'change_artifacts'
  | 'buy_silo'
  | 'store_fuel'
  | 'remove_fuel'
  | 'wait_for_te'
  | 'launch_missions'
  | 'toggle_sale'
  | 'equip_artifact_set'
  | 'update_artifact_set'
  | 'wait_for_missions'
  | 'wait_for_time'
  | 'wait_for_full_habs'
  | 'toggle_earnings_boost'
  | 'notification';

/**
 * Maps action types to their payload interfaces.
 */
export interface ActionPayloadMap {
  start_ascension: StartAscensionPayload;
  buy_vehicle: BuyVehiclePayload;
  buy_hab: BuyHabPayload;
  buy_research: BuyResearchPayload;
  shift: ShiftPayload;
  buy_train_car: BuyTrainCarPayload;
  change_artifacts: import('./artifacts').ChangeArtifactsPayload;
  buy_silo: BuySiloPayload;
  store_fuel: StoreFuelPayload;
  remove_fuel: RemoveFuelPayload;
  wait_for_te: WaitForTEPayload;
  launch_missions: LaunchMissionsPayload;
  toggle_sale: ToggleSalePayload;
  equip_artifact_set: import('./artifacts').EquipArtifactSetPayload;
  update_artifact_set: import('./artifacts').UpdateArtifactSetPayload;
  wait_for_missions: WaitForMissionsPayload;
  wait_for_time: WaitForTimePayload;
  wait_for_full_habs: WaitForFullHabsPayload;
  toggle_earnings_boost: ToggleEarningsBoostPayload;
  notification: NotificationPayload;
}

/**
 * Snapshot of all calculation outputs at a point in time.
 */
export interface CalculationsSnapshot {
  eggValue: number;
  habCapacity: number;
  elr: number;
  shippingCapacity: number;
  layRate: number;
  onlineEarnings: number;
  offlineEarnings: number;
  onlineIHR: number;
  offlineIHR: number;
  ratePerChickenPerSecond: number;
  bankValue: number;
  currentEgg: VirtueEgg;
  shiftCount: number;
  te: number;
  soulEggs: number;
  siloCount: number;
  siloTimeMinutes: number;
  fuelTankAmounts: Record<VirtueEgg, number>;
  eggsDelivered: Record<VirtueEgg, number>;
  teEarned: Record<VirtueEgg, number>;
  population: number;
  lastStepTime: number;
  vehicles: import('../index').VehicleSlot[];
  habIds: (number | null)[];
  researchLevels: import('../index').ResearchLevels;
  artifactLoadout: ArtifactSlotPayload[];
  activeArtifactSet: ArtifactSetName | null;
  artifactSets: Record<ArtifactSetName, ArtifactSlotPayload[] | null>;
  activeSales: {
    research: boolean;
    hab: boolean;
    vehicle: boolean;
  };
  earningsBoost: {
    active: boolean;
    multiplier: number;
  };
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
