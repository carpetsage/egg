// Step metrics computation utilities
// Computes farm metrics (ELR, IHR, capacity, earnings) for each step

import { habTypes, vehicleTypes } from 'lib';
import type {
  AscensionStep,
  InitialData,
  StepMetrics,
  ArtifactLoadout,
  ArtifactSlot,
  ResearchLogEntry,
  VirtueEgg,
} from '@/types';

/**
 * Get the active artifact loadout for a step.
 * Artifacts can only be changed on Humility steps.
 * Non-Humility steps inherit from the most recent Humility visit or initial state.
 */
export function getActiveArtifacts(
  step: AscensionStep,
  previousSteps: AscensionStep[],
  initialData: InitialData
): ArtifactLoadout {
  // If this is a Humility step and has its own artifacts, use them
  if (step.eggType === 'humility' && step.artifacts) {
    return step.artifacts;
  }

  // Look backwards for the most recent Humility step with artifacts
  for (let i = previousSteps.length - 1; i >= 0; i--) {
    const prevStep = previousSteps[i];
    if (prevStep.eggType === 'humility' && prevStep.artifacts) {
      return prevStep.artifacts;
    }
  }

  // No Humility visits yet - use the initial active set
  if (initialData.activeArtifactSet === 'earnings') {
    return initialData.earningsArtifacts;
  } else {
    return initialData.elrArtifacts;
  }
}

/**
 * Accumulate all research purchases from previous steps and current step
 */
export function accumulateResearchLogs(
  previousSteps: AscensionStep[],
  currentStep?: AscensionStep
): ResearchLogEntry[] {
  const accumulated: ResearchLogEntry[] = [];

  for (const step of previousSteps) {
    if (step.researchLog) {
      accumulated.push(...step.researchLog);
    }
  }

  if (currentStep?.researchLog) {
    accumulated.push(...currentStep.researchLog);
  }

  return accumulated;
}

/**
 * Get the current level of a specific research from accumulated logs
 */
export function getResearchLevel(researchId: string, logs: ResearchLogEntry[]): number {
  let maxLevel = 0;
  for (const entry of logs) {
    if (entry.id === researchId) {
      maxLevel = Math.max(maxLevel, entry.level);
    }
  }
  return maxLevel;
}

/**
 * Convert ArtifactLoadout to artifact IDs for effect calculations
 * Returns an array of artifact identifiers that can be used with effect functions
 */
export function loadoutToArtifactIds(loadout: ArtifactLoadout): string[] {
  const ids: string[] = [];
  for (const slot of loadout) {
    if (slot) {
      ids.push(slot.artifactId);
      // Also add stone IDs
      for (const stone of slot.stones) {
        if (stone) {
          ids.push(stone);
        }
      }
    }
  }
  return ids;
}

/**
 * Check if an artifact slot has a specific artifact or stone
 */
export function hasArtifact(loadout: ArtifactLoadout, artifactId: string): boolean {
  for (const slot of loadout) {
    if (slot) {
      if (slot.artifactId === artifactId) return true;
      if (slot.stones.includes(artifactId)) return true;
    }
  }
  return false;
}

/**
 * Get the current hab state by finding the most recent Integrity step with habState.
 * If no Integrity steps with habState exist, returns default (1 Coop, 3 empty slots).
 */
export function getCurrentHabState(
  step: AscensionStep,
  previousSteps: AscensionStep[]
): (number | null)[] {
  // If this is an Integrity step with habState, use it
  if (step.eggType === 'integrity' && step.habState) {
    return step.habState;
  }

  // Look backwards for the most recent Integrity step with habState
  for (let i = previousSteps.length - 1; i >= 0; i--) {
    const prevStep = previousSteps[i];
    if (prevStep.eggType === 'integrity' && prevStep.habState) {
      return prevStep.habState;
    }
  }

  // Default: 1 Coop (id=0), 3 empty slots
  return [0, null, null, null];
}

/**
 * Calculate total hab capacity from hab state.
 * Applies research multipliers and colleggtible modifiers.
 */
export function calculateHabCapacity(
  habState: (number | null)[],
  researchLogs: ResearchLogEntry[],
  habCapModifier: number = 1
): number {
  let baseCapacity = 0;

  for (const habId of habState) {
    if (habId !== null && habId >= 0 && habId < habTypes.length) {
      baseCapacity += habTypes[habId].baseHabSpace;
    }
  }

  // Apply research multipliers for hab capacity
  // Hen House Remodel: +5% per level (id: hab_capacity1)
  // Microlux Chicken Suites: +5% per level (id: microlux)
  // Grav Plating: +5% per level (id: grav_plating)
  // Wormhole Dampening: +2% per level (id: wormhole_dampening)
  const henHouseRemodel = getResearchLevel('hab_capacity1', researchLogs);
  const microlux = getResearchLevel('microlux', researchLogs);
  const gravPlating = getResearchLevel('grav_plating', researchLogs);
  const wormholeDampening = getResearchLevel('wormhole_dampening', researchLogs);

  const researchMultiplier =
    (1 + henHouseRemodel * 0.05) *
    (1 + microlux * 0.05) *
    (1 + gravPlating * 0.05) *
    (1 + wormholeDampening * 0.02);

  return baseCapacity * researchMultiplier * habCapModifier;
}

/**
 * Get current vehicle state from accumulated vehicle logs.
 * Returns array of 4 slots, each containing {vehicleId, trainLength} or null.
 */
export function getCurrentVehicleState(
  step: AscensionStep,
  previousSteps: AscensionStep[]
): { vehicleId: number; trainLength: number }[] {
  // Start with default: 1 Trike (id=0) with 1 car
  const slots: ({ vehicleId: number; trainLength: number } | null)[] = [
    { vehicleId: 0, trainLength: 1 },
    null,
    null,
    null,
  ];

  // Accumulate vehicle logs from all steps
  const allSteps = [...previousSteps, step];
  for (const s of allSteps) {
    if (s.vehicleLog) {
      for (const entry of s.vehicleLog) {
        if (entry.type === 'buy') {
          slots[entry.slotIndex] = { vehicleId: entry.vehicleId, trainLength: entry.trainLength };
        } else if (entry.type === 'add_car' && slots[entry.slotIndex]) {
          slots[entry.slotIndex]!.trainLength = entry.trainLength;
        } else if (entry.type === 'remove') {
          slots[entry.slotIndex] = null;
        }
      }
    }
  }

  return slots.filter((s): s is { vehicleId: number; trainLength: number } => s !== null);
}

/**
 * Calculate total shipping capacity from vehicle state.
 */
export function calculateShippingCapacity(
  vehicles: { vehicleId: number; trainLength: number }[],
  researchLogs: ResearchLogEntry[],
  shippingCapModifier: number = 1
): number {
  let baseCapacity = 0;

  for (const v of vehicles) {
    if (v.vehicleId >= 0 && v.vehicleId < vehicleTypes.length) {
      const vehicle = vehicleTypes[v.vehicleId];
      // Base capacity * train length
      baseCapacity += vehicle.baseCapacity * v.trainLength;
    }
  }

  // If no vehicles, return a minimal capacity (shouldn't happen but safety)
  if (baseCapacity === 0) {
    baseCapacity = 5000; // 1 Trike with 1 car = 5000/min
  }

  // Apply shipping research multipliers
  const leafSprings = getResearchLevel('leafsprings', researchLogs);
  const lightweightBoxes = getResearchLevel('lightweight_boxes', researchLogs);
  const driverTraining = getResearchLevel('driver_training', researchLogs);
  const superAlloy = getResearchLevel('super_alloy', researchLogs);
  const quantumStorage = getResearchLevel('quantum_storage', researchLogs);
  const hyperLoops = getResearchLevel('hyper_loop', researchLogs);

  const researchMultiplier =
    (1 + leafSprings * 0.05) *
    (1 + lightweightBoxes * 0.1) *
    (1 + driverTraining * 0.05) *
    (1 + superAlloy * 0.05) *
    (1 + quantumStorage * 0.05) *
    (1 + hyperLoops * 0.05);

  return baseCapacity * researchMultiplier * shippingCapModifier;
}

/**
 * Compute step metrics based on accumulated state.
 *
 * This is a simplified calculation that provides estimates.
 * For accurate calculations, the full game backup data would be needed.
 *
 * @param step - Current step
 * @param previousSteps - All previous steps
 * @param initialData - Initial player data
 * @returns StepMetrics object
 */
export function computeStepMetrics(
  step: AscensionStep,
  previousSteps: AscensionStep[],
  initialData: InitialData
): StepMetrics {
  const artifacts = getActiveArtifacts(step, previousSteps, initialData);
  const researchLogs = accumulateResearchLogs(previousSteps, step);

  // Base values - these would be computed from research logs in full implementation
  // For now, use placeholder calculations

  // Base ELR calculation (eggs/sec)
  // Base rate: 1 egg per 30 sec per chicken = 0.0333 eggs/sec/chicken
  const baseELRPerChicken = 1 / 30;

  // Apply research multipliers (simplified)
  const comfortableNests = getResearchLevel('comfortable_nests', researchLogs);
  const henHouseAC = getResearchLevel('hen_house_ac', researchLogs);
  const improvedGenetics = getResearchLevel('improved_genetics', researchLogs);
  const timeCompression = getResearchLevel('time_compression', researchLogs);

  const elrResearchMult =
    (1 + comfortableNests * 0.1) *
    (1 + henHouseAC * 0.05) *
    (1 + improvedGenetics * 0.15) *
    (1 + timeCompression * 0.1);

  // Apply artifact multiplier (simplified - check for quantum metronome)
  const artifactELRMult = hasArtifact(artifacts, 'quantum-metronome') ? 1.5 : 1;

  // Apply modifiers
  const modifierELRMult = initialData.modifiers?.elr || 1;

  // Final per-chicken ELR
  const perChickenELR = baseELRPerChicken * elrResearchMult * artifactELRMult * modifierELRMult;

  // Base IHR calculation (chickens/min)
  // Base from epic research + common research
  const internalHatchery1 = getResearchLevel('internal_hatchery1', researchLogs);
  const internalHatchery2 = getResearchLevel('internal_hatchery2', researchLogs);
  const internalHatchery3 = getResearchLevel('internal_hatchery3', researchLogs);
  const internalHatchery4 = getResearchLevel('internal_hatchery4', researchLogs);
  const mlIncubators = getResearchLevel('internal_hatchery5', researchLogs);
  const neuralLinking = getResearchLevel('neural_linking', researchLogs);

  const baseIHR =
    internalHatchery1 * 2 +
    internalHatchery2 * 5 +
    internalHatchery3 * 10 +
    internalHatchery4 * 25 +
    mlIncubators * 5 +
    neuralLinking * 50;

  // Offline IHR multiplier from Internal Hatchery Calm (epic research)
  // Assume some default level or get from initialData if available
  const ihcMultiplier = 1.0; // Would be 1.1^level for Int Hatchery Calm

  // Apply artifact multiplier (simplified - check for chalice)
  const artifactIHRMult = hasArtifact(artifacts, 'the-chalice') ? 1.5 : 1;

  // Apply modifiers and TE bonus
  const modifierIHRMult = initialData.modifiers?.ihr || 1;
  const truthEggs = initialData.truthEggs || 0;
  const soulEggs = initialData.soulEggs || 0;
  const teBonus = Math.pow(1.1, truthEggs);

  // 4 habs always active with max IHR sharing
  const offlineIHR = baseIHR * ihcMultiplier * artifactIHRMult * modifierIHRMult * teBonus * 4;

  // Hab capacity calculation - from accumulated hab state
  const habState = getCurrentHabState(step, previousSteps);
  const habCapMult = initialData.modifiers?.habCap || 1;
  const habCapacity = calculateHabCapacity(habState, researchLogs, habCapMult);

  // Shipping capacity calculation - from accumulated vehicle state
  const vehicles = getCurrentVehicleState(step, previousSteps);
  const shippingCapMult = initialData.modifiers?.shippingCap || 1;
  const shippingCapacity = calculateShippingCapacity(vehicles, researchLogs, shippingCapMult);

  // Time to fill habs
  const timeToFillHabs = offlineIHR > 0 ? (habCapacity / offlineIHR) * 60 : Infinity;

  // Earnings calculation
  // Base egg value is 1 gem for virtue eggs
  const baseEggValue = 1;

  // Earning bonus from TE only - each TE gives ~5% compounding (prophecy bonus approximation)
  // Soul eggs provide a multiplicative bonus, not exponential
  // SE bonus is already factored into the base earning rate from the game backup
  const earningBonus = Math.pow(1.05, truthEggs);
  const earningsMod = initialData.modifiers?.earnings || 1;
  const awayEarningsMod = initialData.modifiers?.awayEarnings || 1;

  // Convert shipping capacity from eggs/min to eggs/sec for consistent units
  const shippingCapacityPerSec = shippingCapacity / 60;

  // Every new farm starts with 1 chicken
  const initialPopulation = 1;

  // At initial (1 chicken):
  // Total ELR from 1 chicken = perChickenELR * 1
  // Effective ELR is capped by shipping capacity
  const initialTotalELR = perChickenELR * initialPopulation;
  const effectiveInitialELR = Math.min(initialTotalELR, shippingCapacityPerSec);
  const offlineEarningsInitial = baseEggValue * effectiveInitialELR * earningBonus * earningsMod * awayEarningsMod * 0.5;

  // At projected (max population):
  // Max chickens limited by shipping = shippingCapacity/sec / perChickenELR
  const shippingLimitedPop = shippingCapacityPerSec / perChickenELR;
  const maxEffectivePop = Math.min(habCapacity, shippingLimitedPop);
  const projectedTotalELR = perChickenELR * maxEffectivePop;
  const effectiveProjectedELR = Math.min(projectedTotalELR, shippingCapacityPerSec);
  const offlineEarningsProjected =
    baseEggValue * effectiveProjectedELR * earningBonus * earningsMod * awayEarningsMod * 0.5;

  return {
    elr: effectiveProjectedELR, // Total effective ELR at max pop (capped by shipping)
    offlineIHR,
    timeToFillHabs,
    offlineEarningsInitial,
    offlineEarningsProjected,
    habCapacity,
    shippingCapacity,
  };
}

/**
 * Represents a purchase from any log type with a unified interface
 */
export interface UnifiedPurchase {
  type: 'research' | 'vehicle' | 'hab';
  index: number;  // Original index in its specific log
  cost: number;
  timestamp: number;
}

/**
 * Get all purchases from a step as a unified, sorted list.
 * This allows iterating through purchases in chronological order.
 */
export function getAllPurchasesSorted(step: AscensionStep): UnifiedPurchase[] {
  const purchases: UnifiedPurchase[] = [];

  // Add research purchases
  if (step.researchLog) {
    step.researchLog.forEach((entry, index) => {
      purchases.push({
        type: 'research',
        index,
        cost: entry.cost,
        timestamp: entry.timestamp,
      });
    });
  }

  // Add vehicle purchases (only 'buy' and 'add_car' have costs)
  if (step.vehicleLog) {
    step.vehicleLog.forEach((entry, index) => {
      if (entry.cost > 0) {
        purchases.push({
          type: 'vehicle',
          index,
          cost: entry.cost,
          timestamp: entry.timestamp,
        });
      }
    });
  }

  // Add hab upgrade purchases
  if (step.habUpgradeLog) {
    step.habUpgradeLog.forEach((entry, index) => {
      purchases.push({
        type: 'hab',
        index,
        cost: entry.cost,
        timestamp: entry.timestamp,
      });
    });
  }

  // Sort by timestamp
  purchases.sort((a, b) => a.timestamp - b.timestamp);

  return purchases;
}

/**
 * Compute metrics at a specific point in the purchase sequence.
 * This allows calculating earnings rate after N purchases.
 *
 * @param step - Current step
 * @param previousSteps - All steps before this one
 * @param initialData - Initial player data
 * @param purchaseIndex - Include purchases 0..purchaseIndex-1 (exclusive)
 * @returns StepMetrics reflecting state after those purchases
 */
export function computeMetricsAtPurchaseIndex(
  step: AscensionStep,
  previousSteps: AscensionStep[],
  initialData: InitialData,
  purchaseIndex: number
): StepMetrics {
  // Get all purchases sorted by timestamp
  const allPurchases = getAllPurchasesSorted(step);

  // Determine which purchases to include (first N)
  const includedPurchases = allPurchases.slice(0, purchaseIndex);

  // Count how many of each type to include
  const researchCount = includedPurchases.filter(p => p.type === 'research').length;
  const vehicleCount = includedPurchases.filter(p => p.type === 'vehicle').length;
  const habCount = includedPurchases.filter(p => p.type === 'hab').length;

  // Create a partial step with only included purchases
  const partialStep: AscensionStep = {
    ...step,
    researchLog: step.researchLog?.slice(0, researchCount) || [],
    vehicleLog: step.vehicleLog?.slice(0, vehicleCount) || [],
    habUpgradeLog: step.habUpgradeLog?.slice(0, habCount) || [],
  };

  // Need to reconstruct habState from habUpgradeLog if this is an Integrity step
  if (step.eggType === 'integrity' && partialStep.habUpgradeLog) {
    // Get starting hab state from previous steps
    let baseHabState = getCurrentHabState({ ...step, habState: undefined }, previousSteps);
    // Apply included upgrades
    for (const upgrade of partialStep.habUpgradeLog) {
      baseHabState = [...baseHabState];
      baseHabState[upgrade.slotIndex] = upgrade.toHabId;
    }
    partialStep.habState = baseHabState;
  }

  return computeStepMetrics(partialStep, previousSteps, initialData);
}

/**
 * Determine if a step is a final visit for its egg type.
 * A final visit is one where the user stays to farm eggs to target.
 * All other visits are intermediate (just for purchases).
 */
export function determineFinalVisits(steps: AscensionStep[], initialData: InitialData): void {
  // Track last visit index for each egg type
  const lastVisitIndex: Record<VirtueEgg, number> = {
    curiosity: -1,
    integrity: -1,
    kindness: -1,
    humility: -1,
    resilience: -1,
  };

  // Find last visit for each egg type
  for (let i = 0; i < steps.length; i++) {
    lastVisitIndex[steps[i].eggType] = i;
  }

  // Mark final visits based on whether there's a target for that egg
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isLastVisit = lastVisitIndex[step.eggType] === i;
    const hasTarget = (initialData.targetGains[step.eggType] || 0) > 0;

    step.isFinalVisit = isLastVisit && hasTarget;
  }
}

/**
 * Format a number in egg notation (e.g., 1.23e15, 5.67B)
 */
export function formatEggNotation(value: number): string {
  if (value === 0) return '0';
  if (!isFinite(value)) return '∞';

  const suffixes = ['', 'K', 'M', 'B', 'T', 'q', 'Q', 's', 'S', 'o', 'N', 'd', 'U', 'D'];
  const magnitude = Math.floor(Math.log10(Math.abs(value)) / 3);

  if (magnitude < 0) return value.toFixed(2);
  if (magnitude >= suffixes.length) {
    return value.toExponential(2);
  }

  const scaledValue = value / Math.pow(1000, magnitude);
  const suffix = suffixes[magnitude];

  if (scaledValue >= 100) {
    return scaledValue.toFixed(0) + suffix;
  } else if (scaledValue >= 10) {
    return scaledValue.toFixed(1) + suffix;
  } else {
    return scaledValue.toFixed(2) + suffix;
  }
}

/**
 * Format duration in human-readable form
 */
export function formatStepDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '∞';

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}
