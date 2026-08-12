// Tests for the solver's joint (product) objective. See OPTIMIZER.md.

import { describe, it, expect } from 'vitest';
import { optimizeFull } from './optimizer-core';
import {
  compileInnerLp,
  alphaToProb,
  exactLogHitProbability,
  tangentLogHitProbability,
  JOINT_TANGENT_BREAKPOINTS,
} from './value-function';
import { makeNode, makeOpt } from './spec-helpers';
import type { RecipeDAG } from './types';

function craftDag(pCraft = 0.1): RecipeDAG {
  return new Map([
    ['A', makeNode('A', false, [['B', 1]], pCraft)],
    ['B', makeNode('B', true)],
  ]);
}

describe('joint objective: balanced split vs. weighted-sum winner-take-all', () => {
  it('splits a shared scarce ingredient between two equal-weight targets', async () => {
    // Shared leaf Z, identical Q: a weighted-sum LP goes all-or-nothing here,
    // while the product objective must balance.
    const dag: RecipeDAG = new Map([
      ['A1', makeNode('A1', false, [['Z', 1]], 0.5)],
      ['A2', makeNode('A2', false, [['Z', 1]], 0.5)],
      ['Z', makeNode('Z', true)],
    ]);

    const sol = await optimizeFull({
      options: [],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A1', 'A2'],
      fuelCapacity: 1000,
      timeCapacity: 100,
      baseYield: new Map([['Z', 10]]),
    });

    const crafts = sol.perTarget.map(t => t.expectedCrafts);
    expect(crafts[0]).toBeGreaterThan(0);
    expect(crafts[1]).toBeGreaterThan(0);
    // Roughly, not exactly, 5/5: the finite tangent grid flattens the optimum
    // over a small interval.
    expect(Math.min(crafts[0], crafts[1])).toBeGreaterThan(3);
    expect(sol.jointProbability).toBeGreaterThan(0);
    expect(sol.jointProbability).toBeCloseTo(sol.perTarget[0].bestProbability * sol.perTarget[1].bestProbability, 9);

    // Contrast: the weighted-sum LP leaves at least one target at zero crafts.
    const naive = compileInnerLp(
      dag,
      ['A1', 'A2'],
      new Map([
        ['A1', 1],
        ['A2', 1],
      ])
    ).solve(new Map([['Z', 10]]));
    const naiveCrafts = [naive.craftByTarget.get('A1') ?? 0, naive.craftByTarget.get('A2') ?? 0];
    expect(Math.min(...naiveCrafts)).toBeCloseTo(0, 6);
    expect(Math.max(...naiveCrafts)).toBeCloseTo(10, 6);
  });

  it('picks a more balanced fuel split across two options than a sum-maximizing greedy, raising jointProbability', async () => {
    // Independent targets competing only for fuel. Maximizing sum(Q*crafts) is
    // indifferent to the split; the joint objective must balance it.
    const dag: RecipeDAG = new Map([
      ['A1', makeNode('A1', false, [['B1', 1]], 0.5)],
      ['A2', makeNode('A2', false, [['B2', 1]], 0.5)],
      ['B1', makeNode('B1', true)],
      ['B2', makeNode('B2', true)],
    ]);
    const optB1 = makeOpt(1, 1, [['B1', 1]]);
    const optB2 = makeOpt(1, 1, [['B2', 1]]);

    const sol = await optimizeFull({
      options: [optB1, optB2],
      recipeDag: dag,
      desiredArtifactNodeIds: ['A1', 'A2'],
      fuelCapacity: 60,
      timeCapacity: 1000,
      baseYield: new Map(),
    });

    const crafts = sol.perTarget.map(t => t.expectedCrafts);
    // Loose bound: a balanced water-filling split lands near 30/30.
    expect(Math.min(...crafts)).toBeGreaterThan(10);
    expect(sol.jointProbability).toBeGreaterThan(0.9);

    // What the all-or-nothing allocation would have scored.
    const naiveA1 = alphaToProb(60, new Map(), ['A1'], dag).bestProbability;
    const naiveA2 = alphaToProb(0, new Map(), ['A2'], dag).bestProbability;
    const naiveJoint = naiveA1 * naiveA2;
    expect(naiveJoint).toBeCloseTo(0, 9);
    expect(sol.jointProbability).toBeGreaterThan(naiveJoint);
  });
});

describe('tangent approximation accuracy', () => {
  it('over-estimates the exact g(s) = log(1 - e^-s) by a small margin', () => {
    // The grid is geometric, so the geometric midpoint of each consecutive pair
    // is where the piecewise-linear envelope sits furthest from exact.
    const sValues: number[] = [];
    for (let i = 0; i < JOINT_TANGENT_BREAKPOINTS.length - 1; i++) {
      sValues.push(Math.sqrt(JOINT_TANGENT_BREAKPOINTS[i] * JOINT_TANGENT_BREAKPOINTS[i + 1]));
    }
    for (const s of sValues) {
      const exact = exactLogHitProbability(s);
      const approx = tangentLogHitProbability(s);
      const exactProb = Math.exp(exact);
      const approxProb = Math.exp(Math.min(approx, 0));
      // Tangent lines of a concave function lie on or above it everywhere.
      expect(approx).toBeGreaterThanOrEqual(exact - 1e-12);
      // Worst case among these midpoints is ~2.5e-2 (at s = 1.27). The grid
      // spends 18 of its 26 points below s = 0.16 to keep log-space error
      // small near zero, and pays for it with a looser probability-space
      // envelope through s = 1..4. Search ranking only; never reporting.
      expect(approxProb - exactProb).toBeGreaterThanOrEqual(-1e-9);
      expect(approxProb - exactProb).toBeLessThan(3e-2);
    }
  });

  it('is exact at the tangent breakpoints themselves', () => {
    for (const s of JOINT_TANGENT_BREAKPOINTS) {
      expect(tangentLogHitProbability(s)).toBeCloseTo(exactLogHitProbability(s), 6);
    }
  });

  it('stays tight in log space near zero, where the split bug originated', () => {
    // The region that used to sit below the first breakpoint (s < 0.05) is now
    // densely sampled, which is the whole point of the geometric grid. Measured
    // log-space errors are ~2.2e-2, ~4.2e-2 and ~1.5e-2; the bounds sit above
    // those. The old grid was off by ~2.93 at s = 0.001.
    for (const s of [0.001, 0.01, 0.03]) {
      const exact = exactLogHitProbability(s);
      const approx = tangentLogHitProbability(s);
      // Still a valid upper envelope: the tangent lies on or above g everywhere.
      expect(approx).toBeGreaterThanOrEqual(exact - 1e-12);
      expect(approx - exact).toBeLessThan(0.06);
    }
  });

  it('degrades in log space below the first breakpoint, but not in probability space', () => {
    // Below s = 1e-5 the envelope runs out of tangents and the log-space error
    // grows without bound, which is why the final reported split is refined
    // off-grid. It stays harmless in probability space because e^g is itself
    // ~1e-5 down here. Measured log errors ~1.4, ~3.6, ~5.9.
    const cases: { s: number; minLogErr: number }[] = [
      { s: 1e-6, minLogErr: 1 },
      { s: 1e-7, minLogErr: 3 },
      { s: 1e-8, minLogErr: 5 },
    ];
    for (const { s, minLogErr } of cases) {
      const exact = exactLogHitProbability(s);
      const approx = tangentLogHitProbability(s);
      expect(approx).toBeGreaterThanOrEqual(exact - 1e-12);
      expect(approx - exact).toBeGreaterThan(minLogErr);
      expect(Math.exp(Math.min(approx, 0)) - Math.exp(exact)).toBeLessThan(1e-5);
    }
  });
});

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
    const sol = await optimizeFull(args);
    expect(sol.perTarget).toHaveLength(1);
    expect(sol.jointProbability).toBeCloseTo(sol.bestProbability, 12);
  });
});
