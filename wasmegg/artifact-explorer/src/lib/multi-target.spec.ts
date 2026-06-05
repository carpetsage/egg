import { describe, it, expect } from 'vitest';
import { compileInnerLp } from './value-function';
import { optimizeFull } from './optimizer-core';
import type { DAGNode, LaunchOption, RecipeDAG } from './types';

// ── helpers ───────────────────────────────────────────────────────────────────
function makeNode(id: string, is_leaf: boolean, children: [string, number][] = [], pCraft = 0): DAGNode {
  return {
    id,
    is_leaf,
    children: children.map(([node_id, quantity]) => ({ node_id, quantity })),
    legendaryCraftProbability: pCraft,
  };
}
let seq = 0;
function makeOpt(
  fuel: number,
  time: number,
  y: [string, number][],
  leg: [string, number][] = [],
  afx = 0
): LaunchOption {
  return {
    id: `opt-${seq++}`,
    ship: 0 as unknown as LaunchOption['ship'],
    target: null,
    targetAfxId: afx as LaunchOption['targetAfxId'],
    actual_fuel: fuel,
    fuel_by_egg: new Map(),
    actual_time: time,
    supply_vector: new Map(y),
    yield_vector: new Map(y),
    legendary_yield_vector: new Map(leg),
  };
}

describe('multi-sink weighted objective LP', () => {
  // MT-1: weighted objective over a SHARED sink. A1 and A2 both consume Z; the LP
  // should pour the shared ingredient into the higher-weight target.
  it('MT-1: shared ingredient routed to the higher-weight target', () => {
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
    expect(hiA1.score).toBeCloseTo(20, 9); // 2*10 + 1*0
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
    expect(hiA2.score).toBeCloseTo(30, 9); // 1*0 + 3*10
    expect(hiA2.craftByTarget.get('A2')).toBeCloseTo(10, 9);
  });

  // MT-2: a target that is ALSO an ingredient of another target. B must keep its
  // conservation row (no deletion) AND be valued in its own right.
  it('MT-2: target-that-is-an-ingredient gets a row and is valued; no deletion', () => {
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]])],
      ['B', makeNode('B', false, [['C', 1]])],
      ['C', makeNode('C', true)],
    ]);
    const w = new Map([
      ['A', 2],
      ['B', 1],
    ]);
    // (a) raw ingredient C available: craft B from C, and A from B; both targets credited.
    const r1 = compileInnerLp(dag, ['A', 'B'], w).solve(new Map([['C', 10]]));
    expect(r1.score).toBeCloseTo(30, 9); // 2*pA(10) + 1*pB(10)
    expect(r1.craftByTarget.get('A')).toBeCloseTo(10, 9);
    expect(r1.craftByTarget.get('B')).toBeCloseTo(10, 9);

    // (b) direct B drops (B is the consumed target) feed A's crafting via B's row.
    const r2 = compileInnerLp(dag, ['A', 'B'], w).solve(new Map([['B', 5]]));
    expect(r2.craftByTarget.get('A')).toBeCloseTo(5, 9); // 5 dropped B → 5 crafted A
    expect(r2.score).toBeCloseTo(10, 9); // 2*5 + 1*0
  });

  // MT-3: A craftable root's DIRECT drops must not be counted as crafts.
  it('MT-3: direct drops of a final target do NOT count as crafts [overlaps VF-9/VF-9b]', () => {
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
    ).toBeCloseTo(3, 9); // was 5 under the bug
    expect(lp.solve(new Map([['A', 4]])).alpha).toBeCloseTo(0, 9); // was 4 under the bug
  });

  // MT-4: the Finding-1 correction end-to-end through optimizeFull. A mission that
  // drops the root directly is no longer over-valued, so the result is the same
  // (correct) optimum regardless of option ordering. (Overlaps the original
  // Finding-1 demonstration: before the fix this returned 0 when optRoot sorted first.)
  it('MT-4: optimizeFull is order-independent for a root-dropping option [overlaps Finding-1 demo]', () => {
    seq = 0;
    const dag: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]], 0.5)],
      ['B', makeNode('B', true)],
    ]);
    const optRoot = makeOpt(1, 10, [['A', 1]], [], 1); // drops the root directly, no legendary
    const optB = makeOpt(1, 10, [['B', 1]], [], 2); // drops the ingredient
    const args = {
      recipe_dag: dag,
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 1000,
      time_capacity: 100,
      base_yield: new Map<string, number>(),
    };
    const rootFirst = optimizeFull({ options: [optRoot, optB], ...args });
    const bFirst = optimizeFull({ options: [optB, optRoot], ...args });
    expect(rootFirst.best_probability).toBeCloseTo(bFirst.best_probability, 9); // order-independent now
    expect(rootFirst.best_probability).toBeGreaterThan(0.99); // crafts via optB
    // the chosen set must rely on the ingredient dropper, not the root dropper
    expect(rootFirst.choice_history.some(c => c.targetAfxId === optB.targetAfxId)).toBe(true);
  });
});
