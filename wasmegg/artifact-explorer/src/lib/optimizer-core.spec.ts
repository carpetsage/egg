import { describe, it, expect, beforeEach } from 'vitest';
import { optimizeFull } from './optimizer-core';
import type { LaunchOption, RecipeDAG, DAGNode } from './types';

// ── DAG helpers ───────────────────────────────────────────────────────────────

function makeNode(id: string, is_leaf: boolean, children: [string, number][] = [], pCraft = 0): DAGNode {
  return {
    id,
    is_leaf,
    children: children.map(([node_id, quantity]) => ({ node_id, quantity })),
    legendaryCraftProbability: pCraft,
  };
}

// A standard 2-node DAG: root 'A' (craftable, pCraft>0) that needs ingredient 'B' (leaf).
// The optimizer scores Q*alpha where Q=-ln(1-pCraft). With pCraft>0, missions yielding B
// produce positive score, giving the optimizer reason to launch.
function craftDag(pCraft = 0.1): RecipeDAG {
  return new Map([
    ['A', makeNode('A', false, [['B', 1]], pCraft)],
    ['B', makeNode('B', true)],
  ]);
}

// ── Option helper ─────────────────────────────────────────────────────────────

let seq = 0;
function makeOpt(
  actual_fuel: number,
  actual_time: number,
  yieldEntries: [string, number][],
  legendaryEntries: [string, number][] = [],
  afxId: number = 0
): LaunchOption {
  return {
    id: `opt-${seq++}`,
    ship: 0 as unknown as LaunchOption['ship'],
    target: null,
    targetAfxId: afxId as LaunchOption['targetAfxId'],
    actual_fuel,
    fuel_by_egg: new Map(),
    actual_time,
    supply_vector: new Map(yieldEntries),
    yield_vector: new Map(yieldEntries),
    legendary_yield_vector: new Map(legendaryEntries),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('optimizeFull', () => {
  beforeEach(() => {
    seq = 0;
  });

  // OC-1: no options at all → trivially zero probability, no crash
  it('OC-1: empty options → best_probability=0, empty allocation', () => {
    const sol = optimizeFull({
      options: [],
      recipe_dag: craftDag(),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 1000,
      time_capacity: 100,
      base_yield: new Map(),
    });
    expect(sol.best_probability).toBeCloseTo(0, 9);
    expect(sol.choice_history).toHaveLength(0);
    expect(sol.fuel_used).toBeCloseTo(0, 9);
  });

  // OC-2: single zero-fuel option, time budget binds
  // s=10, S=100 → k_S=10; each launch yields 1 B → 10 B → alpha=10 crafts of A
  it('OC-2: zero-fuel opt (s=10, S=100) → 10 B accumulated, time≤100', () => {
    const sol = optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 1_000_000,
      time_capacity: 100,
      base_yield: new Map(),
    });
    expect(sol.time_units_used).toBeLessThanOrEqual(100);
    const yieldB = sol.final_yield_vector.get('B') ?? 0;
    expect(yieldB).toBeGreaterThanOrEqual(10);
  });

  // OC-3: time budget binds at a smaller value
  // actual_fuel=0 (no R constraint), actual_time=10, S=50 → k_S=5 launches
  // 5 × 1 B = 5 B; time_units_used = 5 × 10 = 50 exactly
  it('OC-3: S=50, s=10 → exactly 50 time units and 5 B accumulated', () => {
    const sol = optimizeFull({
      options: [makeOpt(0, 10, [['B', 1]])],
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 1_000_000,
      time_capacity: 50,
      base_yield: new Map(),
    });
    expect(sol.time_units_used).toBe(50);
    expect(sol.final_yield_vector.get('B')).toBeCloseTo(5, 9);
  });

  // OC-4: fuel budget binds
  // r=100, R=300, s=1, S=10000 → k_R=3, fuel_used=300
  it('OC-4: fuel budget R=300 with r=100/launch → fuel_used=300', () => {
    const sol = optimizeFull({
      options: [makeOpt(100, 1, [['B', 1]])],
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 300,
      time_capacity: 10_000,
      base_yield: new Map(),
    });
    expect(sol.fuel_used).toBeLessThanOrEqual(300);
    expect(sol.fuel_used).toBeCloseTo(300, 6);
  });

  // OC-5: dominance pruning — opt1 yields 2× B per launch vs opt0's 1×, same cost
  // opt0 is strictly dominated; the solution should use only opt1
  // k = min(100/10, 100/10) = 10 launches of opt1 → 20 B exactly
  it('OC-5: dominated option pruned; dominator captures all budget (20 B exact)', () => {
    const opt0 = makeOpt(10, 10, [['B', 1]], [], 1); // dominated
    const opt1 = makeOpt(10, 10, [['B', 2]], [], 2); // dominates (same cost, 2× yield)
    const sol = optimizeFull({
      options: [opt0, opt1],
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 100,
      time_capacity: 100,
      base_yield: new Map(),
    });
    expect(sol.final_yield_vector.get('B')).toBeCloseTo(20, 6);
    // opt0 is pointwise-dominated by opt1 (same cost, half the yield) and
    // must not appear in the chosen allocation.
    expect(sol.choice_history.find(c => c.targetAfxId === opt0.targetAfxId)).toBeUndefined();
    expect(sol.choice_history.find(c => c.targetAfxId === opt1.targetAfxId)).toBeDefined();
  });

  // OC-7: Joint LP support — complementary options both get allocated
  // DAG: A ← {B:1, C:1}; optB yields B, optC yields C — neither dominates the other.
  // The LP optimum splits the budget evenly (x_B = x_C = 10), so the final allocation
  // must include both options and accumulate ≥ 9 of each ingredient.
  it('OC-7: complementary B/C options both allocated; each yield ≥ 9', () => {
    const dag7: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
          ],
          0.5
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
    ]);
    const optB = makeOpt(10, 10, [['B', 1]], [], 1);
    const optC = makeOpt(10, 10, [['C', 1]], [], 2);
    const sol = optimizeFull({
      options: [optB, optC],
      recipe_dag: dag7,
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 200,
      time_capacity: 200,
      base_yield: new Map(),
    });
    expect(sol.choice_history.length).toBe(2);
    expect(sol.final_yield_vector.get('B') ?? 0).toBeGreaterThanOrEqual(9);
    expect(sol.final_yield_vector.get('C') ?? 0).toBeGreaterThanOrEqual(9);
  });

  // OC-8: Triple-action scan (Step 5 fallback)
  // DAG: A ← {B:1, C:1, D:1}; one option per ingredient, all equal cost.
  // Any pair leaves the third ingredient at 0 → 0 crafts. Pair bestScore = 0.
  // LP allocates x_B = x_C = x_D = 10, score_LP = Q*10. gap = 1.0 > ε → Step 5 runs.
  // Triple (k_B, k_C, k_D) = (10, 10, 10) is the unique feasible triple optimum.
  it('OC-8: triple-scan fallback finds 3-option allocation; each yield = 10', () => {
    const dag8: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
            ['D', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
      ['D', makeNode('D', true)],
    ]);
    const optB = makeOpt(10, 10, [['B', 1]], [], 1);
    const optC = makeOpt(10, 10, [['C', 1]], [], 2);
    const optD = makeOpt(10, 10, [['D', 1]], [], 3);
    const sol = optimizeFull({
      options: [optB, optC, optD],
      recipe_dag: dag8,
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 300,
      time_capacity: 300,
      base_yield: new Map(),
    });
    expect(sol.choice_history.length).toBe(3);
    expect(sol.final_yield_vector.get('B')).toBeCloseTo(10, 6);
    expect(sol.final_yield_vector.get('C')).toBeCloseTo(10, 6);
    expect(sol.final_yield_vector.get('D')).toBeCloseTo(10, 6);
    // alpha = min(10,10,10) = 10 deterministic crafts
    expect(sol.expected_crafts).toBeCloseTo(10, 6);
  });

  // OC-9: Dominance via strict-cost only (strictYield = false)
  // optCheap and optExpensive have identical B yield (1) but optCheap costs half the fuel.
  // dominates(cheap, expensive): strictCost = (10 < 20) = true → pruned.
  it('OC-9: strict-cost dominance prunes expensive option; cheap allocated 10 times', () => {
    const optExpensive = makeOpt(20, 10, [['B', 1]], [], 1);
    const optCheap = makeOpt(10, 10, [['B', 1]], [], 2);
    const sol = optimizeFull({
      options: [optExpensive, optCheap],
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 100,
      time_capacity: 100,
      base_yield: new Map(),
    });
    // optCheap: k = min(100/10, 100/10) = 10 → 10 B
    expect(sol.choice_history.find(c => c.targetAfxId === optExpensive.targetAfxId)).toBeUndefined();
    expect(sol.choice_history.find(c => c.targetAfxId === optCheap.targetAfxId)).toBeDefined();
    expect(sol.final_yield_vector.get('B')).toBeCloseTo(10, 6);
  });

  // OC-10: Legendary-drop probability path via optimizer
  // DAG: A ← B (non-leaf root, pCraft=0 → Q=0). optLeg yields B + legendary A at 0.1/launch.
  // Score = Q*alpha + directLegendary = 0 + k*0.1; maximised at k=10 (both budget caps).
  // lambda = 10 * 0.1 = 1 → drop_probability = 1 − e^{−1}.
  it('OC-10: pCraft=0 → craft=0; legendary lambda=1 → drop=1−e^{−1}', () => {
    const dag10: RecipeDAG = new Map([
      ['A', makeNode('A', false, [['B', 1]], 0)],
      ['B', makeNode('B', true)],
    ]);
    const optLeg = makeOpt(10, 10, [['B', 1]], [['A', 0.1]]);
    const sol = optimizeFull({
      options: [optLeg],
      recipe_dag: dag10,
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 100,
      time_capacity: 100,
      base_yield: new Map(),
    });
    expect(sol.craft_probability).toBeCloseTo(0, 9);
    expect(sol.drop_probability).toBeCloseTo(1 - Math.exp(-1), 6);
    // best = 1 − (1−0)(1−drop) = drop
    expect(sol.best_probability).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  // OC-11: Mixed Z × P pair (Step 3b)
  // DAG: A ← {B:1, C:1}. optZ (fuel=0) yields B; optP (fuel=10) yields C.
  // LP optimum: x_Z = x_P = 10. pairwiseScan (Z×P path) finds k_Z = k_P = 10.
  // Total: 10 B + 10 C → 10 A; fuel = 100 = R; time = 200 = S.
  it('OC-11: Z×P pair from Step 3b; both options allocated; budgets fully consumed', () => {
    const dag11: RecipeDAG = new Map([
      [
        'A',
        makeNode(
          'A',
          false,
          [
            ['B', 1],
            ['C', 1],
          ],
          0.1
        ),
      ],
      ['B', makeNode('B', true)],
      ['C', makeNode('C', true)],
    ]);
    const optZ = makeOpt(0, 10, [['B', 1]], [], 1);
    const optP = makeOpt(10, 10, [['C', 1]], [], 2);
    const sol = optimizeFull({
      options: [optZ, optP],
      recipe_dag: dag11,
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 100,
      time_capacity: 200,
      base_yield: new Map(),
    });
    expect(sol.choice_history.find(c => c.targetAfxId === optZ.targetAfxId)).toBeDefined();
    expect(sol.choice_history.find(c => c.targetAfxId === optP.targetAfxId)).toBeDefined();
    expect(sol.final_yield_vector.get('B')).toBeCloseTo(10, 6);
    expect(sol.final_yield_vector.get('C')).toBeCloseTo(10, 6);
    expect(sol.time_units_used).toBe(200);
    expect(sol.fuel_used).toBeCloseTo(100, 6);
  });

  // OC-6: budget feasibility invariant — never exceed R or S regardless of inputs;
  // also verify that at least one launch actually occurred (no-op stub has 0 launches).
  it('OC-6: fuel_used ≤ R and time_units_used ≤ S always; something launched', () => {
    const opts = [makeOpt(40, 5, [['B', 1]]), makeOpt(60, 8, [['B', 2]]), makeOpt(0, 3, [['B', 1]])];
    const sol = optimizeFull({
      options: opts,
      recipe_dag: craftDag(0.1),
      desired_artifact_node_ids: ['A'],
      fuel_capacity: 100,
      time_capacity: 50,
      base_yield: new Map(),
    });
    expect(sol.fuel_used).toBeLessThanOrEqual(100 + 1e-6);
    expect(sol.time_units_used).toBeLessThanOrEqual(51); // +1 for integer rounding
    expect(sol.choice_history.length).toBeGreaterThan(0);
  });
});
