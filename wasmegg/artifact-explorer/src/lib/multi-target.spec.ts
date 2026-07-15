import { describe, it, expect } from 'vitest';
import { ei } from 'lib';
import { compileInnerLp } from './value-function';
import { optimizeFull } from './optimizer-core';
import { makeNode, makeOpt } from './spec-helpers';
import type { RecipeDAG } from './types';

const Name = ei.ArtifactSpec.Name;

describe('multi-sink weighted objective LP', () => {
  it('routes a shared ingredient to the higher-weight target', () => {
    const dag: RecipeDAG = new Map([
      ['A1', makeNode('A1', false, [['Z', 1]])],
      ['A2', makeNode('A2', false, [['Z', 1]])],
      ['Z', makeNode('Z', true)],
    ]);
    const hiA1 = compileInnerLp(
      dag,
      ['A1', 'A2'],
      new Map([
        ['A1', 2],
        ['A2', 1],
      ])
    ).solve(new Map([['Z', 10]]));
    expect(hiA1.score).toBeCloseTo(20, 9);
    expect(hiA1.craftByTarget.get('A1')).toBeCloseTo(10, 9);
    expect(hiA1.craftByTarget.get('A2')).toBeCloseTo(0, 9);

    const hiA2 = compileInnerLp(
      dag,
      ['A1', 'A2'],
      new Map([
        ['A1', 1],
        ['A2', 3],
      ])
    ).solve(new Map([['Z', 10]]));
    expect(hiA2.score).toBeCloseTo(30, 9);
    expect(hiA2.craftByTarget.get('A2')).toBeCloseTo(10, 9);
  });

  it('handles a target that is also an ingredient of another target', () => {
    // B is both a target and an ingredient of A, so it must keep its
    // conservation row and still be valued in its own right.
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]])],
      ['B', makeNode('B', false, [['C', 1]])],
      ['C', makeNode('C', true)],
    ]);
    const w = new Map([
      ['A', 2],
      ['B', 1],
    ]);
    // raw ingredient C: craft B from C and A from B, both targets credited
    const r1 = compileInnerLp(dag, ['A', 'B'], w).solve(new Map([['C', 10]]));
    expect(r1.score).toBeCloseTo(30, 9);
    expect(r1.craftByTarget.get('A')).toBeCloseTo(10, 9);
    expect(r1.craftByTarget.get('B')).toBeCloseTo(10, 9);

    // dropped B feeds A's crafting through B's conservation row
    const r2 = compileInnerLp(dag, ['A', 'B'], w).solve(new Map([['B', 5]]));
    expect(r2.craftByTarget.get('A')).toBeCloseTo(5, 9);
    expect(r2.score).toBeCloseTo(10, 9);
  });

  it('does not count direct drops of a final target as crafts', () => {
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]])],
      ['B', makeNode('B', true)],
    ]);
    const lp = compileInnerLp(dag, ['A']);
    expect(
      lp.solve(
        new Map([
          ['B', 3],
          ['A', 2],
        ])
      ).alpha
    ).toBeCloseTo(3, 9);
    expect(lp.solve(new Map([['A', 4]])).alpha).toBeCloseTo(0, 9);
  });

  it('is order-independent when an option drops the root directly', () => {
    // A mission dropping the root (without legendaries) must not be
    // over-valued; the result should not depend on option order.
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]], 0.5)],
      ['B', makeNode('B', true)],
    ]);
    const optRoot = makeOpt(1, 10, [['A', 1]], [], Name.LUNAR_TOTEM);
    const optB = makeOpt(1, 10, [['B', 1]], [], Name.TUNGSTEN_ANKH);
    const args = {
      recipeDag: dag,
      desiredArtifactNodeIds: ['A'],
      fuelCapacity: 1000,
      timeCapacity: 100,
      baseYield: new Map<string, number>(),
    };
    const rootFirst = optimizeFull({ options: [optRoot, optB], ...args });
    const bFirst = optimizeFull({ options: [optB, optRoot], ...args });
    expect(rootFirst.bestProbability).toBeCloseTo(bFirst.bestProbability, 9);
    expect(rootFirst.bestProbability).toBeGreaterThan(0.99);
    expect(rootFirst.choiceHistory.some(c => c.targetAfxId === optB.targetAfxId)).toBe(true);
  });
});
