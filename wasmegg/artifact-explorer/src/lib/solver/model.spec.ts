// Regression coverage for the quantity guard in `buildModel`: a non-finite
// inventory or yield must not reach the LP matrix, the way a non-finite cost
// already can't (see the comment above the cost guard in model.ts).
//
// Asserted through a solve rather than against the matrix. What matters is that
// a bad quantity cannot poison a plan; which internal column or row it was
// filtered out of is this formulation's business, and pinning that here would
// mean rewriting this file every time the formulation moves.

import { describe, expect, it } from 'vitest';
import { solveWith } from './oa';
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
