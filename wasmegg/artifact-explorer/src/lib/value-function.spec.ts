import { describe, it, expect } from 'vitest';
import { compileInnerLp, alphaToProb } from './value-function';
import { makeNode } from './spec-helpers';
import type { RecipeDAG, DAGNode } from './types';

const PREC = 9;

function dag(...nodes: DAGNode[]): RecipeDAG {
  return new Map(nodes.map(n => [n.id, n]));
}

function diamondDag(): RecipeDAG {
  // A needs B and C, which both need the same leaf D
  return dag(
    makeNode('A', false, [
      ['B', 1],
      ['C', 1],
    ]),
    makeNode('B', false, [['D', 1]]),
    makeNode('C', false, [['D', 1]]),
    makeNode('D', true)
  );
}

describe('compileInnerLp + solve: alpha computation', () => {
  it('leaf root: alpha is just the inventory count', () => {
    const d = dag(makeNode('A', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['A', 7]])).alpha).toBeCloseTo(7, PREC);
  });

  it('leaf root with empty inventory', () => {
    const d = dag(makeNode('A', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map()).alpha).toBeCloseTo(0, PREC);
  });

  it('no desired artifacts', () => {
    const d = dag(makeNode('A', true));
    const lp = compileInnerLp(d, []);
    expect(lp.solve(new Map([['A', 10]])).alpha).toBeCloseTo(0, PREC);
  });

  it('linear chain: each B makes one A', () => {
    const d = dag(makeNode('A', false, [['B', 1]]), makeNode('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 10]])).alpha).toBeCloseTo(10, PREC);
  });

  it('linear chain with qty 2 gives a fractional LP relaxation', () => {
    // 2 B per A, 5 B available, so alpha = 2.5
    const d = dag(makeNode('A', false, [['B', 2]]), makeNode('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 5]])).alpha).toBeCloseTo(2.5, PREC);
  });

  it('two-level chain', () => {
    const d = dag(makeNode('A', false, [['B', 1]]), makeNode('B', false, [['C', 1]]), makeNode('C', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['C', 8]])).alpha).toBeCloseTo(8, PREC);
  });

  it('diamond dependency splits the shared ingredient', () => {
    // B and C both consume D, so 6 D only supports 3 A. A naive tree
    // recursion would count the 6 D twice and report 6.
    const lp = compileInnerLp(diamondDag(), ['A']);
    expect(lp.solve(new Map([['D', 6]])).alpha).toBeCloseTo(3, PREC);
  });

  it('diamond dependency, smaller inventory', () => {
    const lp = compileInnerLp(diamondDag(), ['A']);
    expect(lp.solve(new Map([['D', 4]])).alpha).toBeCloseTo(2, PREC);
  });

  it('zero inventory of the only ingredient', () => {
    const d = dag(makeNode('A', false, [['B', 1]]), makeNode('B', true));
    const lp = compileInnerLp(d, ['A']);
    expect(lp.solve(new Map([['B', 0]])).alpha).toBeCloseTo(0, PREC);
  });

  it('shadow price of the ingredient in a linear chain is 1', () => {
    const d = dag(makeNode('A', false, [['B', 1]]), makeNode('B', true));
    const lp = compileInnerLp(d, ['A']);
    const result = lp.solve(new Map([['B', 10]]));
    expect(result.duals.get('B')).toBeCloseTo(1, PREC);
  });

  it('shadow price of the shared diamond ingredient is 0.5', () => {
    const lp = compileInnerLp(diamondDag(), ['A']);
    const result = lp.solve(new Map([['D', 6]]));
    expect(result.duals.get('D')).toBeCloseTo(0.5, PREC);
  });

  it('repeated solves on one compiled LP do not leak state', () => {
    // the outer search reuses one compiled LP millions of times
    const d = dag(makeNode('A', false, [['B', 1]]), makeNode('B', true));
    const lp = compileInnerLp(d, ['A']);
    const r1 = lp.solve(new Map([['B', 3]]));
    const r2 = lp.solve(new Map([['B', 7]]));
    expect(r1.alpha).toBeCloseTo(3, PREC);
    expect(r2.alpha).toBeCloseTo(7, PREC);
  });
});

describe('alphaToProb', () => {
  function makedag(pCraft: number) {
    return dag(makeNode('A', false, [], pCraft));
  }

  it('alpha=0 means no crafting regardless of pCraft', () => {
    const r = alphaToProb(0, new Map(), ['A'], makedag(0.5));
    expect(r.craftProbability).toBeCloseTo(0, PREC);
    expect(r.dropProbability).toBeCloseTo(0, PREC);
    expect(r.bestProbability).toBeCloseTo(0, PREC);
  });

  it('craft probability is 1 - (1-p)^alpha', () => {
    // p=0.5, alpha=4: 1 - 0.0625
    const r = alphaToProb(4, new Map(), ['A'], makedag(0.5));
    expect(r.craftProbability).toBeCloseTo(0.9375, PREC);
    expect(r.dropProbability).toBeCloseTo(0, PREC);
    expect(r.bestProbability).toBeCloseTo(0.9375, PREC);
  });

  it('craft probability with alpha=2', () => {
    const r = alphaToProb(2, new Map(), ['A'], makedag(0.5));
    expect(r.craftProbability).toBeCloseTo(0.75, PREC);
  });

  it('drop-only path when pCraft is 0', () => {
    const r = alphaToProb(1, new Map([['A', 1]]), ['A'], makedag(0));
    expect(r.craftProbability).toBeCloseTo(0, PREC);
    expect(r.dropProbability).toBeCloseTo(1 - Math.exp(-1), PREC);
    expect(r.bestProbability).toBeCloseTo(1 - Math.exp(-1), PREC);
  });

  it('pCraft=1 is a guaranteed craft', () => {
    const r = alphaToProb(2, new Map(), ['A'], makedag(1.0));
    expect(r.craftProbability).toBeCloseTo(1, PREC);
    expect(r.bestProbability).toBeCloseTo(1, PREC);
  });

  it('drop probability follows the Poisson rate', () => {
    const r = alphaToProb(0, new Map([['A', 2]]), ['A'], makedag(0));
    expect(r.craftProbability).toBeCloseTo(0, PREC);
    expect(r.dropProbability).toBeCloseTo(1 - Math.exp(-2), PREC);
  });

  it('combines craft and drop by inclusion-exclusion', () => {
    const craft = 0.9375; // p=0.5, alpha=4
    const drop = 1 - Math.exp(-1);
    const expectedBest = 1 - (1 - craft) * (1 - drop);
    const r = alphaToProb(4, new Map([['A', 1]]), ['A'], makedag(0.5));
    expect(r.craftProbability).toBeCloseTo(craft, PREC);
    expect(r.dropProbability).toBeCloseTo(drop, PREC);
    expect(r.bestProbability).toBeCloseTo(expectedBest, PREC);
  });

  it('empty desired list gives all zeros', () => {
    const r = alphaToProb(10, new Map([['A', 5]]), [], makedag(0.9));
    expect(r.craftProbability).toBe(0);
    expect(r.dropProbability).toBe(0);
    expect(r.bestProbability).toBe(0);
  });
});
