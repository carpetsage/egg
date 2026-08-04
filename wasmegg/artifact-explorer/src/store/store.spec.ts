// These cover ./schema only. The reactive store in ./index.ts reads
// localStorage at module load and can't be imported under node, so its
// load/persist helpers are exercised indirectly through these validators.

import { describe, it, expect } from 'vitest';

import {
  DEFAULT_WAIT_TIME_DAYS,
  isExtrasConfig,
  isMissionFilters,
  isOverrideFlags,
  newExtras,
  newMissionFilters,
  newOverrides,
} from './schema';

describe('OverrideFlags', () => {
  it('defaults everything to off', () => {
    const flags = newOverrides();

    expect(flags.craftingLevel).toBe(false);
    expect(flags.previousCrafts).toBe(false);
    expect(flags.epicResearchFTLLevel).toBe(false);
    expect(flags.epicResearchZerogLevel).toBe(false);
    expect(flags.shipLevels).toEqual({});
    expect(flags.shipVisibility).toEqual({});
    expect(flags.tankLevel).toBe(false);
  });

  it('validates a default object', () => {
    expect(isOverrideFlags(newOverrides())).toBe(true);
  });

  it('rejects objects with missing fields', () => {
    const invalid = {
      craftingLevel: false,
      previousCrafts: false,
    };
    expect(isOverrideFlags(invalid)).toBe(false);
  });

  it('accepts persisted blobs without tankLevel', () => {
    // tankLevel was added later; old localStorage blobs don't have it
    const old = {
      craftingLevel: false,
      previousCrafts: false,
      epicResearchFTLLevel: false,
      epicResearchZerogLevel: false,
      shipLevels: {},
      shipVisibility: {},
    };
    expect(isOverrideFlags(old)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isOverrideFlags(null)).toBe(false);
    expect(isOverrideFlags(undefined)).toBe(false);
    expect(isOverrideFlags('string')).toBe(false);
    expect(isOverrideFlags(123)).toBe(false);
  });
});

describe('ExtrasConfig', () => {
  const MAX_TANK_LEVEL = 7;

  it('defaults to max crafting level and the given tank level', () => {
    const extras = newExtras(MAX_TANK_LEVEL);

    expect(extras.craftingLevel).toBe(30);
    expect(extras.previousCrafts).toBe(0);
    expect(extras.tankLevel).toBe(MAX_TANK_LEVEL);
  });

  it('validates a default object', () => {
    expect(isExtrasConfig(newExtras(MAX_TANK_LEVEL))).toBe(true);
  });

  it('rejects objects with missing fields', () => {
    expect(isExtrasConfig({ craftingLevel: 30 })).toBe(false);
  });

  it('accepts persisted blobs without tankLevel', () => {
    const old = {
      craftingLevel: 30,
      previousCrafts: 0,
    };
    expect(isExtrasConfig(old)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isExtrasConfig(null)).toBe(false);
    expect(isExtrasConfig(undefined)).toBe(false);
    expect(isExtrasConfig('string')).toBe(false);
    expect(isExtrasConfig(123)).toBe(false);
  });
});

describe('MissionFilters', () => {
  it('defaults to a medium effort and the default time budget', () => {
    const filters = newMissionFilters();

    expect(filters.effort).toBe('medium');
    expect(filters.maxGemCostEnabled).toBe(false);
    expect(filters.waitTimeDays).toBe(DEFAULT_WAIT_TIME_DAYS);
  });

  it('validates a default object', () => {
    expect(isMissionFilters(newMissionFilters())).toBe(true);
  });

  it('accepts persisted blobs without waitTimeDays', () => {
    const old = { effort: 'high', maxGemCostEnabled: true, maxGemCost: 12 };
    expect(isMissionFilters(old)).toBe(true);
  });

  it('rejects a non-string waitTimeDays', () => {
    expect(isMissionFilters({ ...newMissionFilters(), waitTimeDays: 30 })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isMissionFilters(null)).toBe(false);
    expect(isMissionFilters(undefined)).toBe(false);
    expect(isMissionFilters('string')).toBe(false);
    expect(isMissionFilters(123)).toBe(false);
  });
});
