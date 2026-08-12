// The persisted-settings validators, at the two points where a bad value is
// silent rather than obvious.
//
// Most of what these validators reject fails loudly: a shape they let through
// wrong means settings visibly do not survive a reload, which is a bug you meet
// the first time you use the page. The golden egg capacity is the exception —
// `buildModel` reads a non-finite capacity as "no cap", so a blob carrying one
// leaves the checkbox on with nothing enforcing it, and the plan comes back
// looking fine.

import { describe, it, expect } from 'vitest';

import { isMissionFilters, newMissionFilters } from './schema';

describe('MissionFilters', () => {
  // A capacity buildModel would read as "no cap" must not validate, or the
  // checkbox stays on with nothing enforcing it.
  it('rejects a maxGoldenEggCost that could never bind', () => {
    for (const maxGoldenEggCost of [-1, NaN, Infinity, -Infinity]) {
      expect(isMissionFilters({ ...newMissionFilters(), maxGoldenEggCost })).toBe(false);
    }
  });

  it('still accepts a zero capacity, which is a real cap and not an absent one', () => {
    expect(isMissionFilters({ ...newMissionFilters(), maxGoldenEggCost: 0 })).toBe(true);
  });
});
