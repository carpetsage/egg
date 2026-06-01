// ============================================================
// Store schema — persisted config shapes, their defaults, and the
// type guards that validate values loaded from localStorage.
//
// This module is intentionally free of side effects: it never reads
// localStorage or touches `window` at import time, so it can be unit
// tested directly in a node environment. The reactive store in
// ./index.ts builds its refs and load/persist helpers on top of it.
// ============================================================

import type { ei } from 'lib';

type Spaceship = ei.MissionInfo.Spaceship;

// Per-field override flags. true = use the manual `config` value instead of player data.
export interface OverrideFlags {
  craftingLevel: boolean;
  previousCrafts: boolean;
  epicResearchFTLLevel: boolean;
  epicResearchZerogLevel: boolean;
  shipLevels: Partial<Record<Spaceship, boolean>>;
  shipVisibility: Partial<Record<Spaceship, boolean>>;
  tankLevel: boolean;
}

export function newOverrides(): OverrideFlags {
  return {
    craftingLevel: false,
    previousCrafts: false,
    epicResearchFTLLevel: false,
    epicResearchZerogLevel: false,
    shipLevels: {},
    shipVisibility: {},
    tankLevel: false,
  };
}

export function isOverrideFlags(x: unknown): x is OverrideFlags {
  if (!x || typeof x !== 'object') return false;
  const o = x as OverrideFlags;
  return (
    typeof o.previousCrafts === 'boolean' &&
    typeof o.craftingLevel === 'boolean' &&
    typeof o.epicResearchFTLLevel === 'boolean' &&
    typeof o.epicResearchZerogLevel === 'boolean' &&
    typeof o.shipLevels === 'object' &&
    o.shipLevels !== null &&
    typeof o.shipVisibility === 'object' &&
    o.shipVisibility !== null &&
    (o.tankLevel === undefined || typeof o.tankLevel === 'boolean')
  );
}

// Manual values that aren't part of ShipsConfig (crafting level, prior crafts on the
// targeted artifact, fuel tank level). Persisted alongside `config` and `overrides`.
export interface ExtrasConfig {
  craftingLevel: number;
  previousCrafts: number;
  tankLevel: number;
}

// `maxTankLevel` is the largest fuel-tank index (derived from game data by the
// caller) and becomes the default tank level for a fresh config.
export function newExtras(maxTankLevel: number): ExtrasConfig {
  return { craftingLevel: 30, previousCrafts: 0, tankLevel: maxTankLevel };
}

export function isExtrasConfig(x: unknown): x is ExtrasConfig {
  if (!x || typeof x !== 'object') return false;
  const e = x as ExtrasConfig;
  return (
    typeof e.craftingLevel === 'number' &&
    typeof e.previousCrafts === 'number' &&
    (e.tankLevel === undefined || typeof e.tankLevel === 'number')
  );
}

export interface MissionFilters {
  minDurationHoursEnabled: boolean;
  minDurationHours: number;
}

export function newMissionFilters(): MissionFilters {
  return { minDurationHoursEnabled: false, minDurationHours: 0 };
}

export function isMissionFilters(x: unknown): x is MissionFilters {
  if (!x || typeof x !== 'object') return false;
  const m = x as MissionFilters;
  return typeof m.minDurationHoursEnabled === 'boolean' && typeof m.minDurationHours === 'number';
}
