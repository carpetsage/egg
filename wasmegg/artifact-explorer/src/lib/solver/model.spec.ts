// Regression coverage for the quantity guard in `buildModel`: a non-finite
// inventory or yield must not reach the LP matrix, the way a non-finite cost
// already can't (see the comment above the cost guard in model.ts).
//
// Asserted through a solve rather than against the matrix. What matters is that
// a bad quantity cannot poison a plan; which internal column or row it was
// filtered out of is this formulation's business, and pinning that here would
// mean rewriting this file every time the formulation moves.

import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, envelopeErrorNats, solveWith } from './oa';
import { loadHighs } from './highs';
import { makeNode, makeOpt } from '../spec-helpers';
import type { RecipeDAG } from '../types';
import type { PlanProblem } from './types';

const dag: RecipeDAG = new Map([
  ['A1', makeNode('A1', false, [['B1', 1]], 0.5)],
  ['B1', makeNode('B1', true)],
]);

describe('buildModel rejects non-finite quantities the way it rejects non-finite costs', () => {
  it('a solve survives Infinity in yieldVector, legendaryYieldVector, and baseYield together', async () => {
    const solve = await loadHighs();
    const problem: PlanProblem = {
      options: [
        makeOpt(1, 1, [['B1', Infinity]]), // dropped: non-finite yield
        makeOpt(1, 1, [], [['A1', Infinity]]), // dropped: non-finite legendary yield
        makeOpt(1, 1, [['B1', 1]]), // the only usable option
      ],
      dag,
      targets: ['A1'],
      fuelCapacity: 60,
      timeCapacity: 1000,
      slots: 3,
      baseYield: new Map([['B1', NaN]]), // clamped to 0
    };
    const result = solveWith(problem, solve);
    expect(result.allocation).toHaveLength(problem.options.length);
    expect(result.allocation.every(n => Number.isFinite(n) && n >= 0)).toBe(true);
    // The surviving option must be the one actually used.
    expect(result.allocation[2]).toBeGreaterThan(0);
    expect(result.allocation[0]).toBe(0);
    expect(result.allocation[1]).toBe(0);
  });
});

// The grid's justification is an error bound, and the bound is the only reason
// `SIGMA_FLOOR` and `SIGMA_CUTS` are the numbers they are. Asserted here so
// re-tuning either one has to look at what it costs in nats, instead of leaving
// a comment behind that describes the previous grid.
describe('the default tangent grid stays inside its stated envelope error', () => {
  it('starts at 1, stays in (0, 1], and errs by under 2e-3 nats', () => {
    const grid = DEFAULT_TUNING.grid;
    expect(grid[0]).toBeCloseTo(1, 12);
    const floor = grid[grid.length - 1];
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBeLessThan(1);
    expect(envelopeErrorNats(floor, grid.length)).toBeLessThan(2e-3);
  });
});
