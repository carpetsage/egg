// Persisted config shapes, defaults, and the type guards that validate
// localStorage values. Kept free of side effects (no localStorage or window
// access at import time) so it can be unit tested under node.

import { virtueShipGemCosts, ei } from 'lib';

type Spaceship = ei.MissionInfo.Spaceship;

// Per-field flags: true means use the manual config value instead of the
// value from player data.
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

// Manual values that aren't part of ShipsConfig, persisted alongside config
// and overrides.
export interface ExtrasConfig {
  craftingLevel: number;
  previousCrafts: number;
  tankLevel: number;
}

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

// How much effort the player is willing to put into relaunching missions.
// Lower effort adds more slack to each mission's duration when the optimizer
// budgets time, which biases it away from lots of tiny, babysitting-heavy
// launches. See EFFORT_SLACK_SECONDS for the added time per level.
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'infinite'] as const;

export type EffortLevel = (typeof EFFORT_LEVELS)[number];

// Slack added to every mission's duration for budgeting, per effort level.
// A shorter mission carries proportionally more of this fixed overhead, so
// short missions only survive when they're genuinely worth the relaunching.
export const EFFORT_SLACK_SECONDS: Record<EffortLevel, number> = {
  low: 4 * 3600, // relaunch roughly every 4 hours
  medium: 3600, // relaunch roughly hourly
  high: 300, // relaunch within ~5 minutes
  infinite: 0, // relaunch instantly (raw durations)
};

export function isEffortLevel(x: unknown): x is EffortLevel {
  return (EFFORT_LEVELS as readonly unknown[]).includes(x);
}

export interface MissionFilters {
  effort: EffortLevel;
  // Maximum gem cost of a mission's ship on the Egg of Humility.
  maxGemCostEnabled: boolean;
  maxGemCost: number;
}

export function newMissionFilters(): MissionFilters {
  return {
    effort: 'medium',
    maxGemCostEnabled: false,
    maxGemCost: virtueShipGemCosts[ei.MissionInfo.Spaceship.ATREGGIES],
  };
}

export function isMissionFilters(x: unknown): x is MissionFilters {
  if (!x || typeof x !== 'object') return false;
  const m = x as MissionFilters;
  return (
    (m.effort === undefined || isEffortLevel(m.effort)) &&
    (m.maxGemCostEnabled === undefined || typeof m.maxGemCostEnabled === 'boolean') &&
    (m.maxGemCost === undefined || typeof m.maxGemCost === 'number')
  );
}
