import { getDiscountedVehiclePrice, getDiscountedTrainCarPrice, getVehicleType, type VehicleCostModifiers } from '@/lib/vehicles';
import { getTimeToSave } from '@/engine/apply';
import type { CalculationsSnapshot } from '@/types';

export interface VehicleMultipliers {
  universalMultiplier: number;
  hoverMultiplier: number;
  hyperloopMultiplier: number;
  epicMultiplier: number;
  shippingCapMultiplier: number;
  artifactMultiplier: number;
}

const HYPERLOOP_ID = 11;

/**
 * Capacity of a single vehicle slot (eggs/second), given the slot's vehicle/train
 * length and the effective multipliers in play.
 */
export function calculateVehicleCapacity(
  slot: { vehicleId: number | null; trainLength: number },
  universalMultiplier: number,
  hoverMultiplier: number,
  hyperloopMultiplier: number,
  epicMultiplier: number,
  shippingCapMultiplier: number,
  artifactMultiplier: number
): number {
  if (slot.vehicleId === null) return 0;
  const vt = getVehicleType(slot.vehicleId);
  if (!vt) return 0;

  const trainLength = vt.isHyperloop ? slot.trainLength : 1;
  const baseCapacity = vt.baseCapacityPerSecond * trainLength;

  const vehicleHoverMult = vt.isHover ? hoverMultiplier : 1;
  const vehicleHyperloopMult = vt.isHyperloop ? hyperloopMultiplier : 1;

  return (
    baseCapacity *
    universalMultiplier *
    epicMultiplier *
    vehicleHoverMult *
    vehicleHyperloopMult *
    shippingCapMultiplier *
    artifactMultiplier
  );
}

export interface VehiclePurchaseStep {
  slotIndex: number;
  type: 'upgrade_hyperloop' | 'add_car';
  cost: number;
  waitSeconds: number;
}

export interface VehiclePlanResult {
  steps: VehiclePurchaseStep[];
  totalSeconds: number;
  allMaxed: boolean;
}

/**
 * Simulate maxing out every vehicle slot: upgrade to Hyperloop, then fill its train
 * cars, one slot fully before moving to the next (not globally-greedy across slots -
 * this mirrors the manual planner's "Max Vehicles" button exactly, slot 0 to slot N).
 */
export function planMaxVehicles(
  vehicles: { vehicleId: number | null; trainLength: number }[],
  maxSlots: number,
  maxTrainLength: number,
  costModifiers: VehicleCostModifiers,
  isSaleActive: boolean,
  multipliers: VehicleMultipliers,
  startSnapshot: {
    bankValue: number;
    offlineEarnings: number;
    population: number;
    habCapacity: number;
    offlineIHR: number;
    shippingCapacity: number;
    ratePerChickenPerSecond: number;
    elr: number;
    layRate: number;
  }
): VehiclePlanResult {
  const steps: VehiclePurchaseStep[] = [];
  let totalSeconds = 0;

  const capacityOf = (slot: { vehicleId: number | null; trainLength: number }) =>
    calculateVehicleCapacity(
      slot,
      multipliers.universalMultiplier,
      multipliers.hoverMultiplier,
      multipliers.hyperloopMultiplier,
      multipliers.epicMultiplier,
      multipliers.shippingCapMultiplier,
      multipliers.artifactMultiplier
    );

  const virtualVehicles = vehicles.map(v => ({ ...v })).slice(0, maxSlots);
  while (virtualVehicles.length < maxSlots) {
    virtualVehicles.push({ vehicleId: null, trainLength: 1 });
  }

  // Earnings per shipped egg stays constant as slots are upgraded (only shippingCapacity/elr move).
  const earningsPerEgg = startSnapshot.elr > 0 ? startSnapshot.offlineEarnings / startSnapshot.elr : 0;

  const virtualSnapshot = { ...startSnapshot };

  const applyPurchase = (oldCap: number, newCap: number, price: number, seconds: number) => {
    const P0 = virtualSnapshot.population;
    const I = virtualSnapshot.offlineIHR / 60;
    // seconds can be Infinity (unaffordable in finite time); P0 + I * Infinity would be
    // NaN when I is 0, so branch instead of letting that multiplication happen. Given
    // infinite time, population settles at habCapacity if it grows at all, else stays put.
    virtualSnapshot.population =
      seconds === Infinity ? (I > 0 ? virtualSnapshot.habCapacity : P0) : Math.min(virtualSnapshot.habCapacity, P0 + I * seconds);
    virtualSnapshot.shippingCapacity += newCap - oldCap;

    virtualSnapshot.layRate = virtualSnapshot.population * virtualSnapshot.ratePerChickenPerSecond;
    virtualSnapshot.elr = Math.min(virtualSnapshot.layRate, virtualSnapshot.shippingCapacity);
    virtualSnapshot.offlineEarnings = virtualSnapshot.elr * earningsPerEgg;

    virtualSnapshot.bankValue = Math.max(0, virtualSnapshot.bankValue - price);
  };

  for (let i = 0; i < maxSlots; i++) {
    const slot = virtualVehicles[i];
    let currentLength = 1;

    // 1. Upgrade to Hyperloop
    if (slot.vehicleId !== HYPERLOOP_ID) {
      const currentHyperloopCount = virtualVehicles.filter(v => v.vehicleId === HYPERLOOP_ID).length;
      const price = getDiscountedVehiclePrice(HYPERLOOP_ID, currentHyperloopCount, costModifiers, isSaleActive);
      const seconds = getTimeToSave(price, virtualSnapshot as CalculationsSnapshot);

      totalSeconds += seconds;
      steps.push({ slotIndex: i, type: 'upgrade_hyperloop', cost: price, waitSeconds: seconds });

      const oldCap = capacityOf(slot);
      const newCap = capacityOf({ vehicleId: HYPERLOOP_ID, trainLength: 1 });
      applyPurchase(oldCap, newCap, price, seconds);

      virtualVehicles[i] = { vehicleId: HYPERLOOP_ID, trainLength: 1 };
    } else {
      currentLength = slot.trainLength;
    }

    // 2. Add cars
    for (let l = currentLength; l < maxTrainLength; l++) {
      const carPrice = getDiscountedTrainCarPrice(l, costModifiers, isSaleActive);
      const seconds = getTimeToSave(carPrice, virtualSnapshot as CalculationsSnapshot);

      totalSeconds += seconds;
      steps.push({ slotIndex: i, type: 'add_car', cost: carPrice, waitSeconds: seconds });

      const oldCap = capacityOf({ vehicleId: HYPERLOOP_ID, trainLength: l });
      const newCap = capacityOf({ vehicleId: HYPERLOOP_ID, trainLength: l + 1 });
      applyPurchase(oldCap, newCap, carPrice, seconds);

      virtualVehicles[i].trainLength = l + 1;
    }
  }

  return { steps, totalSeconds, allMaxed: steps.length === 0 };
}

export interface VehicleBudgetStep {
  type: 'vehicle' | 'car';
  slotIndex: number;
  vehicleId?: number; // present when type === 'vehicle'
  cost: number;
}

export interface VehicleBudgetPlanResult {
  steps: VehicleBudgetStep[];
  totalSpent: number;
}

/**
 * Simulate spending up to `budget` on whichever single next purchase (upgrade any
 * slot to any higher vehicle tier, or add a car to a Hyperloop slot) has the best
 * deltaCapacity/cost score, repeating until nothing more fits the remaining budget.
 * A purchase adding >1000 capacity always outranks pure ROI.
 */
export function planVehiclesWithinBudget(
  vehicles: { vehicleId: number | null; trainLength: number }[],
  maxSlots: number,
  maxTrainLength: number,
  costModifiers: VehicleCostModifiers,
  isSaleActive: boolean,
  multipliers: VehicleMultipliers,
  budget: number
): VehicleBudgetPlanResult {
  const steps: VehicleBudgetStep[] = [];
  let spent = 0;

  const capacityOf = (slot: { vehicleId: number | null; trainLength: number }) =>
    calculateVehicleCapacity(
      slot,
      multipliers.universalMultiplier,
      multipliers.hoverMultiplier,
      multipliers.hyperloopMultiplier,
      multipliers.epicMultiplier,
      multipliers.shippingCapMultiplier,
      multipliers.artifactMultiplier
    );

  const virtualSlots = vehicles.map(v => ({ ...v })).slice(0, maxSlots);
  while (virtualSlots.length < maxSlots) {
    virtualSlots.push({ vehicleId: null, trainLength: 1 });
  }

  while (spent < budget) {
    let bestAction:
      | { type: 'vehicle'; slotIndex: number; vehicleId: number; cost: number }
      | { type: 'car'; slotIndex: number; cost: number }
      | null = null;
    let bestScore = -1;

    const vehicleCounts: Record<number, number> = {};
    for (const slot of virtualSlots) {
      if (slot.vehicleId !== null) {
        vehicleCounts[slot.vehicleId] = (vehicleCounts[slot.vehicleId] || 0) + 1;
      }
    }

    for (let i = 0; i < virtualSlots.length; i++) {
      const slot = virtualSlots[i];

      // 1. Consider upgrading vehicle
      const currentId = slot.vehicleId;
      const startId = currentId === null ? 0 : currentId + 1;

      for (let nextId = startId; nextId <= HYPERLOOP_ID; nextId++) {
        const cost = getDiscountedVehiclePrice(nextId, vehicleCounts[nextId] || 0, costModifiers, isSaleActive);

        if (spent + cost <= budget) {
          const deltaCap = capacityOf({ vehicleId: nextId, trainLength: 1 }) - capacityOf(slot);
          if (deltaCap >= 0) {
            const roi = deltaCap / Math.max(cost, 1e-10);
            const score = deltaCap > 1000 ? deltaCap * 1000 + roi : roi;
            if (score > bestScore) {
              bestScore = score;
              bestAction = { type: 'vehicle', slotIndex: i, vehicleId: nextId, cost };
            }
          }
        }
      }

      // 2. Consider adding a Hyperloop car
      if (slot.vehicleId === HYPERLOOP_ID && slot.trainLength < maxTrainLength) {
        const cost = getDiscountedTrainCarPrice(slot.trainLength, costModifiers, isSaleActive);
        if (spent + cost <= budget) {
          const currentCap = capacityOf(slot);
          const nextCap = capacityOf({ ...slot, trainLength: slot.trainLength + 1 });
          const deltaCap = nextCap - currentCap;
          if (deltaCap > 0) {
            const roi = deltaCap / Math.max(cost, 1e-10);
            const score = deltaCap > 1000 ? deltaCap * 1000 + roi : roi;
            if (score > bestScore) {
              bestScore = score;
              bestAction = { type: 'car', slotIndex: i, cost };
            }
          }
        }
      }
    }

    if (!bestAction) break;

    if (bestAction.type === 'vehicle') {
      steps.push({ type: 'vehicle', slotIndex: bestAction.slotIndex, vehicleId: bestAction.vehicleId, cost: bestAction.cost });
      virtualSlots[bestAction.slotIndex] = { vehicleId: bestAction.vehicleId, trainLength: 1 };
    } else {
      steps.push({ type: 'car', slotIndex: bestAction.slotIndex, cost: bestAction.cost });
      virtualSlots[bestAction.slotIndex].trainLength++;
    }

    spent += bestAction.cost;
  }

  return { steps, totalSpent: spent };
}
