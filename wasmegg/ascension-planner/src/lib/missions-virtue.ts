// Rocket mission helpers for virtue/ascension planning

import { MissionType, spaceshipList, missionDurationTypeList } from 'lib';
import type { ScheduledLaunch, EpicResearchLevels, VirtueEgg } from '@/types';
import { ei } from 'lib';

const MAX_CONCURRENT_SLOTS = 3;

/**
 * Compute the return time offset for a scheduled launch
 */
export function getReturnTimeOffset(
  launch: ScheduledLaunch,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): number {
  const missionType = new MissionType(launch.shipType, launch.durationType);
  const durationSeconds = missionType.boostedDurationSecondsAtLevel(epicResearch.afxMissionTime);
  return launch.launchTimeOffset + durationSeconds;
}

/**
 * Get the boosted capacity for a launch
 */
export function getLaunchCapacity(
  launch: ScheduledLaunch,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionCapacity'>
): number {
  const missionType = new MissionType(launch.shipType, launch.durationType);
  const baseCapacity = missionType.defaultCapacity + missionType.params.levelCapacityBump * launch.shipLevel;
  return Math.floor(baseCapacity * (1 + 0.05 * epicResearch.afxMissionCapacity));
}

/**
 * Get the boosted quality for a launch
 */
export function getLaunchQuality(launch: ScheduledLaunch): number {
  const missionType = new MissionType(launch.shipType, launch.durationType);
  return Math.round((missionType.params.quality + missionType.params.levelQualityBump * launch.shipLevel) * 100) / 100;
}

/**
 * Get all launches that are in flight at a specific time offset
 */
export function getLaunchesInFlight(
  launches: ScheduledLaunch[],
  atTimeOffset: number,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): ScheduledLaunch[] {
  return launches.filter(launch => {
    const returnTime = getReturnTimeOffset(launch, epicResearch);
    return launch.launchTimeOffset <= atTimeOffset && returnTime > atTimeOffset;
  });
}

/**
 * Get which slot indices (0, 1, 2) are occupied at a given time
 */
export function getOccupiedSlots(
  launches: ScheduledLaunch[],
  atTimeOffset: number,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): Set<number> {
  const inFlight = getLaunchesInFlight(launches, atTimeOffset, epicResearch);

  // Assign slots based on launch order - each launch gets the first available slot at its launch time
  const slotAssignments = new Map<string, number>();
  const sortedLaunches = [...launches].sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

  for (const launch of sortedLaunches) {
    // Find which slots are occupied at this launch's start time
    const occupiedAtLaunchTime = new Set<number>();
    for (const otherLaunch of sortedLaunches) {
      if (otherLaunch.id === launch.id) continue;
      const otherReturn = getReturnTimeOffset(otherLaunch, epicResearch);
      if (otherLaunch.launchTimeOffset <= launch.launchTimeOffset && otherReturn > launch.launchTimeOffset) {
        const otherSlot = slotAssignments.get(otherLaunch.id);
        if (otherSlot !== undefined) {
          occupiedAtLaunchTime.add(otherSlot);
        }
      }
    }

    // Assign first available slot
    for (let slot = 0; slot < MAX_CONCURRENT_SLOTS; slot++) {
      if (!occupiedAtLaunchTime.has(slot)) {
        slotAssignments.set(launch.id, slot);
        break;
      }
    }
  }

  // Return slots that are occupied at the query time
  const occupiedNow = new Set<number>();
  for (const launch of inFlight) {
    const slot = slotAssignments.get(launch.id);
    if (slot !== undefined) {
      occupiedNow.add(slot);
    }
  }

  return occupiedNow;
}

/**
 * Get slot assignments for all launches
 */
export function getSlotAssignments(
  launches: ScheduledLaunch[],
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): Map<string, number> {
  const slotAssignments = new Map<string, number>();
  const sortedLaunches = [...launches].sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

  for (const launch of sortedLaunches) {
    // Find which slots are occupied at this launch's start time
    const occupiedAtLaunchTime = new Set<number>();
    for (const otherLaunch of sortedLaunches) {
      if (otherLaunch.id === launch.id) continue;
      const otherReturn = getReturnTimeOffset(otherLaunch, epicResearch);
      if (otherLaunch.launchTimeOffset <= launch.launchTimeOffset && otherReturn > launch.launchTimeOffset) {
        const otherSlot = slotAssignments.get(otherLaunch.id);
        if (otherSlot !== undefined) {
          occupiedAtLaunchTime.add(otherSlot);
        }
      }
    }

    // Assign first available slot
    for (let slot = 0; slot < MAX_CONCURRENT_SLOTS; slot++) {
      if (!occupiedAtLaunchTime.has(slot)) {
        slotAssignments.set(launch.id, slot);
        break;
      }
    }
  }

  return slotAssignments;
}

/**
 * Check if a slot is available at a specific time
 */
export function isSlotAvailableAt(
  launches: ScheduledLaunch[],
  atTimeOffset: number,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): boolean {
  const inFlight = getLaunchesInFlight(launches, atTimeOffset, epicResearch);
  return inFlight.length < MAX_CONCURRENT_SLOTS;
}

/**
 * Get the next available time when a slot opens up
 */
export function getNextAvailableTime(
  launches: ScheduledLaunch[],
  afterTimeOffset: number,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): number {
  // If a slot is already available, return the requested time
  if (isSlotAvailableAt(launches, afterTimeOffset, epicResearch)) {
    return afterTimeOffset;
  }

  // Find all return times after the given offset
  const returnTimes = launches
    .map(launch => getReturnTimeOffset(launch, epicResearch))
    .filter(returnTime => returnTime > afterTimeOffset)
    .sort((a, b) => a - b);

  // Check each return time to see if a slot becomes available
  for (const returnTime of returnTimes) {
    if (isSlotAvailableAt(launches, returnTime, epicResearch)) {
      return returnTime;
    }
  }

  // If no launches, first available time is now
  return afterTimeOffset;
}

/**
 * Mapping from ei.Egg to VirtueEgg
 */
export function eggToVirtueEgg(egg: ei.Egg): VirtueEgg | null {
  switch (egg) {
    case ei.Egg.CURIOSITY:
      return 'curiosity';
    case ei.Egg.INTEGRITY:
      return 'integrity';
    case ei.Egg.KINDNESS:
      return 'kindness';
    case ei.Egg.HUMILITY:
      return 'humility';
    case ei.Egg.RESILIENCE:
      return 'resilience';
    default:
      return null;
  }
}

/**
 * Get fuel requirements for a launch (virtue eggs only)
 */
export function getVirtueFuelRequirements(launch: ScheduledLaunch): Partial<Record<VirtueEgg, number>> {
  const missionType = new MissionType(launch.shipType, launch.durationType);
  const fuels = missionType.virtueFuels;

  const requirements: Partial<Record<VirtueEgg, number>> = {};
  for (const fuel of fuels) {
    const virtueEgg = eggToVirtueEgg(fuel.egg);
    if (virtueEgg) {
      requirements[virtueEgg] = (requirements[virtueEgg] || 0) + fuel.amount;
    }
  }

  return requirements;
}

/**
 * Interface for fuel validation errors
 */
export interface FuelError {
  launchId: string;
  egg: VirtueEgg;
  shortfall: number;
}

/**
 * Compute fuel state after all scheduled launches
 */
export function computeFuelState(
  initialTank: Record<VirtueEgg, number>,
  launches: ScheduledLaunch[],
  isHumilityStep: boolean
): { remaining: Record<VirtueEgg, number>; errors: FuelError[] } {
  const remaining: Record<VirtueEgg, number> = { ...initialTank };
  const errors: FuelError[] = [];

  // Sort by launch time
  const sorted = [...launches].sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

  for (const launch of sorted) {
    const fuel = getVirtueFuelRequirements(launch);

    for (const [egg, amount] of Object.entries(fuel) as [VirtueEgg, number][]) {
      if (egg === 'humility' && isHumilityStep) {
        // Direct from production - skip tank deduction
        continue;
      }

      remaining[egg] -= amount;
      if (remaining[egg] < 0) {
        errors.push({
          launchId: launch.id,
          egg,
          shortfall: -remaining[egg],
        });
      }
    }
  }

  return { remaining, errors };
}

/**
 * Get total fuel consumed by all launches
 */
export function getTotalFuelConsumed(
  launches: ScheduledLaunch[],
  isHumilityStep: boolean
): Record<VirtueEgg, number> {
  const totals: Record<VirtueEgg, number> = {
    curiosity: 0,
    integrity: 0,
    kindness: 0,
    humility: 0,
    resilience: 0,
  };

  for (const launch of launches) {
    const fuel = getVirtueFuelRequirements(launch);
    for (const [egg, amount] of Object.entries(fuel) as [VirtueEgg, number][]) {
      if (egg === 'humility' && isHumilityStep) {
        // Humility eggs come from direct production on Humility step
        continue;
      }
      totals[egg] += amount;
    }
  }

  return totals;
}

/**
 * Check if a ship is an FTL ship (supports targeting)
 */
export function isFTLShip(shipType: number): boolean {
  return shipType >= ei.MissionInfo.Spaceship.MILLENIUM_CHICKEN;
}

/**
 * Get available ship types for virtue missions
 */
export function getAvailableShipTypes(): { shipType: number; name: string }[] {
  return spaceshipList.map(shipType => {
    const missionType = new MissionType(shipType, ei.MissionInfo.DurationType.SHORT);
    return {
      shipType,
      name: missionType.shipName,
    };
  });
}

/**
 * Get available duration types (excluding tutorial)
 */
export function getAvailableDurationTypes(): { durationType: number; name: string }[] {
  return missionDurationTypeList
    .filter(dt => dt !== ei.MissionInfo.DurationType.TUTORIAL)
    .map(durationType => {
      const missionType = new MissionType(ei.MissionInfo.Spaceship.HENERPRISE, durationType);
      return {
        durationType,
        name: missionType.durationTypeName,
      };
    });
}

/**
 * Format seconds as day offset string (e.g., "Day 0", "Day 1.5")
 */
export function formatDayOffset(seconds: number): string {
  const days = seconds / (24 * 60 * 60);
  if (days === Math.floor(days)) {
    return `Day ${days}`;
  }
  return `Day ${days.toFixed(1)}`;
}

/**
 * Format seconds as duration string for display
 */
export function formatLaunchDuration(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

/**
 * Get max ship level for a ship type
 */
export function getMaxShipLevel(shipType: number): number {
  const missionType = new MissionType(shipType, ei.MissionInfo.DurationType.SHORT);
  return missionType.maxLevel;
}

/**
 * Get mission duration in seconds for a launch
 */
export function getLaunchDuration(
  launch: ScheduledLaunch,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): number {
  const missionType = new MissionType(launch.shipType, launch.durationType);
  return missionType.boostedDurationSecondsAtLevel(epicResearch.afxMissionTime);
}

/**
 * Recompact the schedule after a launch is removed.
 * Slides all launches in the same slot forward to close gaps.
 */
export function recompactSchedule(
  launches: ScheduledLaunch[],
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): ScheduledLaunch[] {
  if (launches.length === 0) return [];

  // Get slot assignments for current schedule
  const slotAssignments = getSlotAssignments(launches, epicResearch);

  // Group launches by slot
  const slotGroups: Map<number, ScheduledLaunch[]> = new Map();
  for (const launch of launches) {
    const slot = slotAssignments.get(launch.id) ?? 0;
    if (!slotGroups.has(slot)) {
      slotGroups.set(slot, []);
    }
    slotGroups.get(slot)!.push(launch);
  }

  // For each slot, recompact by scheduling each launch right after the previous one returns
  const recompacted: ScheduledLaunch[] = [];

  for (const [_slot, slotLaunches] of slotGroups) {
    // Sort by current launch time
    slotLaunches.sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

    let nextAvailableTime = 0;
    for (const launch of slotLaunches) {
      recompacted.push({
        ...launch,
        launchTimeOffset: nextAvailableTime,
      });
      nextAvailableTime = nextAvailableTime + getLaunchDuration(launch, epicResearch);
    }
  }

  // Sort final result by launch time
  recompacted.sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

  return recompacted;
}

/**
 * Move a launch to a new time, adjusting other launches in the same slot if needed
 */
export function moveLaunchToTime(
  launches: ScheduledLaunch[],
  launchId: string,
  newTimeOffset: number,
  epicResearch: Pick<EpicResearchLevels, 'afxMissionTime'>
): ScheduledLaunch[] {
  const launchIndex = launches.findIndex(l => l.id === launchId);
  if (launchIndex === -1) return launches;

  const updatedLaunches = launches.map(l => {
    if (l.id === launchId) {
      return { ...l, launchTimeOffset: Math.max(0, newTimeOffset) };
    }
    return l;
  });

  // Re-sort by launch time
  updatedLaunches.sort((a, b) => a.launchTimeOffset - b.launchTimeOffset);

  return updatedLaunches;
}
