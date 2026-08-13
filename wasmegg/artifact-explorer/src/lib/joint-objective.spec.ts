// The joint (product) objective, at the one place it is a promise to the
// caller rather than a property of the linearization. See OPTIMIZER.md.
//
// That the product objective balances instead of collapsing onto the cheapest
// target is arena M1/M3's subject, measured over instances that can actually
// punish an imbalance. The tangent envelope's error profile used to be pinned
// here against measured magnitudes at specific breakpoints, which made the grid
// unable to change without rewriting the test that described the old one — it
// is `oa.ts`'s own error law (see `SIGMA_CUTS`) and is checked where the grid is
// chosen, not here.

import { describe, it, expect } from 'vitest';
import { optimizeFull } from './optimizer-core';
import { compileInnerLp } from './value-function';
import { craftDag, makeOpt } from './spec-helpers';

describe('the product objective reduces to the linear score at n=1', () => {
  // Checked against independently computed answers, not a second code path.
  const dag = craftDag(0.1);
  const opt = makeOpt(10, 10, [['B', 1]]);
  const args = {
    options: [opt],
    recipeDag: dag,
    desiredArtifactNodeIds: ['A'],
    fuelCapacity: 65,
    timeCapacity: 40,
    baseYield: new Map<string, number>(),
    maximumCost: Infinity,
  };

  it('lands on the plain linear score optimum', async () => {
    const sol = await optimizeFull(args);

    // Brute force the linear score S = Q*alpha over every packable
    // multiplicity, converting to a probability once at the end.
    const Q = -Math.log(1 - 0.1);
    const perSlot = Math.floor(args.timeCapacity / opt.actualTime);
    const maxK = Math.min(Math.floor(args.fuelCapacity / opt.actualFuel), 3 * perSlot);
    let bestScore = 0;
    for (let k = 0; k <= maxK; k++) {
      // packable into 3 slots of equal capacity
      if (k > 3 * perSlot) continue;
      const alpha = compileInnerLp(dag, ['A']).solve(new Map([['B', k]])).alpha;
      bestScore = Math.max(bestScore, Q * alpha);
    }

    expect(sol.bestProbability).toBeCloseTo(1 - Math.exp(-bestScore), 9);
  });

  it('reports jointProbability as that one target’s own probability', async () => {
    // The card prints both, so at a single target they have to agree.
    const sol = await optimizeFull(args);
    expect(sol.perTarget).toHaveLength(1);
    expect(sol.jointProbability).toBeCloseTo(sol.bestProbability, 12);
  });
});
