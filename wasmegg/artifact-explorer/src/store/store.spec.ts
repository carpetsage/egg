// ============================================================
// Store schema validators + tank-level logic
// ============================================================
//
// The schema validators and defaults are imported and exercised
// directly from ./schema, which is a side-effect-free module. The
// reactive store in ./index.ts cannot be imported here: it reads
// localStorage at module load, which throws in the node environment
// vitest runs in. Its refs, computeds, and load/persist helpers are
// therefore covered indirectly, through the schema functions they
// build on.

import { describe, it, expect } from 'vitest';

import { isExtrasConfig, isOverrideFlags, newExtras, newOverrides } from './schema';

// ============================================================
// Test suite
// ============================================================

describe('OverrideFlags validator and defaults', () => {
  it('newOverrides returns correct default structure', () => {
    const flags = newOverrides();

    expect(flags.craftingLevel).toBe(false);
    expect(flags.previousCrafts).toBe(false);
    expect(flags.epicResearchFTLLevel).toBe(false);
    expect(flags.epicResearchZerogLevel).toBe(false);
    expect(flags.shipLevels).toEqual({});
    expect(flags.shipVisibility).toEqual({});
    expect(flags.tankLevel).toBe(false);
  });

  it('isOverrideFlags accepts valid OverrideFlags object', () => {
    const valid = newOverrides();
    expect(isOverrideFlags(valid)).toBe(true);
  });

  it('isOverrideFlags rejects missing required fields', () => {
    const invalid = {
      craftingLevel: false,
      previousCrafts: false,
      // missing other required fields
    };
    expect(isOverrideFlags(invalid)).toBe(false);
  });

  it('isOverrideFlags accepts blobs without tankLevel (backwards compat)', () => {
    const blobWithoutTankLevel = {
      craftingLevel: false,
      previousCrafts: false,
      epicResearchFTLLevel: false,
      epicResearchZerogLevel: false,
      shipLevels: {},
      shipVisibility: {},
      // no tankLevel
    };
    expect(isOverrideFlags(blobWithoutTankLevel)).toBe(true);
  });

  it('isOverrideFlags rejects non-object inputs', () => {
    expect(isOverrideFlags(null)).toBe(false);
    expect(isOverrideFlags(undefined)).toBe(false);
    expect(isOverrideFlags('string')).toBe(false);
    expect(isOverrideFlags(123)).toBe(false);
  });
});

describe('ExtrasConfig validator and defaults', () => {
  // newExtras receives the largest tank index from the caller (game data);
  // any value passes straight through as the default tank level.
  const MAX_TANK_LEVEL = 7;

  it('newExtras returns correct default structure', () => {
    const extras = newExtras(MAX_TANK_LEVEL);

    expect(extras.craftingLevel).toBe(30);
    expect(extras.previousCrafts).toBe(0);
    expect(extras.tankLevel).toBe(MAX_TANK_LEVEL);
  });

  it('isExtrasConfig accepts valid ExtrasConfig object', () => {
    const valid = newExtras(MAX_TANK_LEVEL);
    expect(isExtrasConfig(valid)).toBe(true);
  });

  it('isExtrasConfig rejects missing required fields', () => {
    const invalid = {
      craftingLevel: 30,
      // missing previousCrafts and tankLevel
    };
    expect(isExtrasConfig(invalid)).toBe(false);
  });

  it('isExtrasConfig accepts blobs without tankLevel (backwards compat)', () => {
    const blobWithoutTankLevel = {
      craftingLevel: 30,
      previousCrafts: 0,
      // no tankLevel
    };
    expect(isExtrasConfig(blobWithoutTankLevel)).toBe(true);
  });

  it('isExtrasConfig rejects non-object inputs', () => {
    expect(isExtrasConfig(null)).toBe(false);
    expect(isExtrasConfig(undefined)).toBe(false);
    expect(isExtrasConfig('string')).toBe(false);
    expect(isExtrasConfig(123)).toBe(false);
  });
});
