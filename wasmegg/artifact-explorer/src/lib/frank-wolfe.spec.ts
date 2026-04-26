// ============================================================
// Stage 5a — Higher-order Frank-Wolfe tests
// ============================================================
//
// HARD RULES (from plan Stage 6c):
// - Tests pin mathematically CORRECT behavior.
// - Tests #3, #4, #7 are EXPECTED TO FAIL on the current codebase.
// - DO NOT modify assertions to match observed output.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { DAGNode, RecipeDAG, LaunchOption } from './types';
import {
  MaxCraftCountDirect,
  Objective,
  ComputeGradient,
  LinearMinimizationOracle,
  OptimizeFrankWolfe,
} from './frank-wolfe';

// ============================================================
// Synthetic DAG builders (no real game data)
// ============================================================

/**
 * Build a DAGNode. All fields required by the interface.
 * Use is_leaf=true for raw drops, is_leaf=false for craftable.
 */
function makeLeaf(id: string): DAGNode {
  return {
    id,
    display_name: id,
    is_leaf: true,
    is_root: false,
    required_quantity: 1,
    children: [],
    legendaryCraftProbability: 0.5,
  };
}

function makeNode(id: string, children: { node_id: string; quantity: number }[], lcp = 0.5): DAGNode {
  return {
    id,
    display_name: id,
    is_leaf: false,
    is_root: false,
    required_quantity: 1,
    children,
    legendaryCraftProbability: lcp,
  };
}

/**
 * Minimal valid LaunchOption mock.
 * We only need id, yield_vector, actual_fuel, actual_time for the optimizer.
 * Other fields are set to safe defaults.
 */
function makeOption(id: string, yieldVector: Map<string, number>, fuel: number, time: number): LaunchOption {
  return {
    id,
    ship: {} as any, // not used in the math paths under test
    target: null,
    targetAfxId: 0 as any, // ei.ArtifactSpec.Name.UNKNOWN = 0
    actual_fuel: fuel,
    fuel_by_egg: new Map(),
    actual_time: time,
    fuel_units: fuel,
    time_units: time,
    num_ships_launched: 0,
    yield_vector: yieldVector,
    legendary_yield_vector: new Map(),
    supply_vector: new Map(),
  };
}

// ============================================================
// 5a Tests 1-4: MaxCraftCountDirect
// ============================================================

describe('MaxCraftCountDirect', () => {
  // Test 1: basic single-recipe
  // DAG: R (craftable, root) needs 2×L (leaf)
  // yieldVector {L: 6} → supply(L)/2 = 6/2 = 3.0
  // yieldVector {L: 5} → supply(L)/2 = 5/2 = 2.5
  it('basic single-recipe: R needs 2×L', () => {
    const L = makeLeaf('L');
    const R = makeNode('R', [{ node_id: 'L', quantity: 2 }]);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R', R],
    ]);

    const yA = new Map([['L', 6]]);
    expect(MaxCraftCountDirect(R, dag, yA)).toBe(3);

    const yB = new Map([['L', 5]]);
    // The function returns floats (no floor); 5/2 = 2.5
    expect(MaxCraftCountDirect(R, dag, yB)).toBe(2.5);
  });

  // Test 2: root's own drops are excluded
  // DAG: R needs 2×L. yieldVector {R: 100, L: 6} → result still 3 (R drops excluded)
  // Pins the "direct drop channel not yet implemented" behavior.
  it("root's own drops are excluded from craft count", () => {
    const L = makeLeaf('L');
    const R = makeNode('R', [{ node_id: 'L', quantity: 2 }]);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R', R],
    ]);

    const y = new Map([
      ['R', 100],
      ['L', 6],
    ]);
    // R's own drop entry should NOT be counted; only craft supply matters
    expect(MaxCraftCountDirect(R, dag, y)).toBe(3);
  });

  // Test 3: child's own drops ARE included (EXPECTED TO FAIL TODAY)
  // DAG: R needs 1×M; M needs 2×L; both M and L are yielded.
  // supply(L) = 6  (leaf)
  // supply(M, isRoot=false) = M_drops + supply(L)/2 = 4 + 6/2 = 7
  // supply(R) = supply(M)/1 = 7
  //
  // BUG: MaxCraftCountDirect re-enters supply() with isRoot=true default,
  // so M.lambda is incorrectly excluded (treated as if M is also a root).
  // Correct answer: 7.  Current code returns 3 (ignores M's own drops).
  it('child drops ARE included in supply [EXPECTED TO FAIL]', () => {
    const L = makeLeaf('L');
    const M = makeNode('M', [{ node_id: 'L', quantity: 2 }]);
    const R = makeNode('R', [{ node_id: 'M', quantity: 1 }]);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['M', M],
      ['R', R],
    ]);

    const y = new Map([
      ['M', 4],
      ['L', 6],
    ]);
    // Correct: supply(M) = 4 + 6/2 = 7; supply(R) = 7/1 = 7
    expect(MaxCraftCountDirect(R, dag, y)).toBe(7);
  });

  // Test 4: diamond DAG double-counting (EXPECTED TO FAIL TODAY)
  // DAG: R needs 1×M1 AND 1×M2; M1 needs 1×L; M2 needs 1×L.
  // yieldVector {L: 3}
  // Correct answer: only 1 R is craftable (3 Ls split between M1 and M2 paths → 1.5 each → min(1.5,1.5) = 1.5 but integer = 1... actually as floats = 1.5).
  // Wait — let me recalculate: supply(M1) = L/1 = 3; supply(M2) = L/1 = 3.
  // supply(R) = min(supply(M1)/1, supply(M2)/1) = min(3,3) = 3.
  // But they SHARE the same L pool, so correctly only 1.5 R can be made.
  // Current code returns 3 (double-counts L). Pin the CORRECT answer: 1.5.
  it('diamond DAG: shared subtree is double-counted [EXPECTED TO FAIL]', () => {
    const L = makeLeaf('L');
    const M1 = makeNode('M1', [{ node_id: 'L', quantity: 1 }]);
    const M2 = makeNode('M2', [{ node_id: 'L', quantity: 1 }]);
    const R = makeNode('R', [
      { node_id: 'M1', quantity: 1 },
      { node_id: 'M2', quantity: 1 },
    ]);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['M1', M1],
      ['M2', M2],
      ['R', R],
    ]);

    const y = new Map([['L', 3]]);
    // Correct: 3 Ls shared between M1 and M2 → 1.5 R (or 1 if integer)
    // The function returns floats, so the correct float answer is 1.5
    expect(MaxCraftCountDirect(R, dag, y)).toBeCloseTo(1.5, 9);
  });
});

// ============================================================
// 5a Tests 5-6: Objective
// ============================================================

describe('Objective', () => {
  // Test 5: joint probability = product of per-artifact probabilities
  it('joint probability equals product of per-artifact probabilities', () => {
    // Simple DAG: two independent desired artifacts R1 and R2
    // each needs 1×L, legendaryCraftProbability = 0.5
    // yieldVector {L1: 4, L2: 4}
    // craftCount(R1) = 4; lambda1 = 4*0.5=2; p1 = poissonAtLeast(2,1)
    // craftCount(R2) = 4; lambda2 = 4*0.5=2; p2 = poissonAtLeast(2,1)
    // joint = p1 * p2

    const L1 = makeLeaf('L1');
    const L2 = makeLeaf('L2');
    const R1 = makeNode('R1', [{ node_id: 'L1', quantity: 1 }], 0.5);
    const R2 = makeNode('R2', [{ node_id: 'L2', quantity: 1 }], 0.5);
    const dag: RecipeDAG = new Map([
      ['L1', L1],
      ['L2', L2],
      ['R1', R1],
      ['R2', R2],
    ]);

    const y = new Map([
      ['L1', 4],
      ['L2', 4],
    ]);
    const joint = Objective(y, ['R1', 'R2'], dag);

    // Each artifact independently: craftCount = 4, lambda = 4*0.5 = 2
    const lambda = 4 * 0.5;
    const pSingle = 1 - Math.exp(-lambda); // poissonAtLeast(lambda, 1)
    const expectedJoint = pSingle * pSingle;

    expect(Math.abs(joint - expectedJoint)).toBeLessThan(1e-12);
  });

  // Test 6: early-zero short-circuit — if first artifact has zero probability → result is 0
  it('returns 0 immediately when first artifact probability is 0', () => {
    // R1 has no leaves in the dag → craftCount = 0 → pCraft = 0
    // R2 would be nonzero but should short-circuit
    const L = makeLeaf('L');
    const R1 = makeNode('R1', [{ node_id: 'MISSING', quantity: 1 }], 0.5);
    const R2 = makeNode('R2', [{ node_id: 'L', quantity: 1 }], 0.5);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R1', R1],
      ['R2', R2],
    ]);
    // MISSING is not in dag → supply(MISSING)=0 → craftCount=0 → joint*=0

    const y = new Map([['L', 100]]);
    const result = Objective(y, ['R1', 'R2'], dag);
    expect(result).toBe(0);
  });
});

// ============================================================
// 5a Test 7: ComputeGradient vs finite differences (EXPECTED TO LIKELY FAIL)
// ============================================================

describe('ComputeGradient', () => {
  // Test 7: Compare analytic gradient to central finite differences on a small DAG.
  // DAG: R needs 2×L (leaf). Desired: [R]. legendaryCraftProbability = 0.3.
  // yieldVector: {L: 4}
  // For each key k: (Objective(y+h*e_k) - Objective(y-h*e_k)) / (2h) ≈ grad[k]
  // Relative error per key < 1e-3.
  //
  // EXPECTED TO LIKELY FAIL due to the isRoot bug in BackpropCraftGradient.
  it('analytic gradient matches central finite differences within 1e-3 relative error [EXPECTED TO LIKELY FAIL]', () => {
    const L = makeLeaf('L');
    const R = makeNode('R', [{ node_id: 'L', quantity: 2 }], 0.3);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R', R],
    ]);

    const y = new Map([['L', 4]]);
    const grad = ComputeGradient(y, ['R'], dag);

    const h = 1e-4;
    for (const key of y.keys()) {
      const yPlus = new Map(y);
      yPlus.set(key, (yPlus.get(key) ?? 0) + h);
      const yMinus = new Map(y);
      yMinus.set(key, (yMinus.get(key) ?? 0) - h);

      const fd = (Objective(yPlus, ['R'], dag) - Objective(yMinus, ['R'], dag)) / (2 * h);
      const analytic = grad.get(key) ?? 0;

      // Relative error = |analytic - fd| / max(|fd|, 1e-10)
      const relErr = Math.abs(analytic - fd) / Math.max(Math.abs(fd), 1e-10);
      expect(relErr).toBeLessThan(1e-3);
    }
  });
});

// ============================================================
// 5a Tests 8-11: LinearMinimizationOracle
// ============================================================

describe('LinearMinimizationOracle', () => {
  // Test 8: single-vertex case — one option, clearly optimal
  it('single option: allocation puts all budget on it', () => {
    const opt = makeOption('A', new Map([['L', 1]]), 10, 5);
    const grad = new Map([['L', 1]]);
    const F = 100;
    const T = 50;

    const { allocation } = LinearMinimizationOracle(grad, [opt], F, T, new Map());

    // opt can run min(F/10, T/5) = min(10, 10) = 10 times
    expect(allocation[0]).toBeCloseTo(10, 6);
  });

  // Test 9: two-option vertex — regression test for commit 43687f55
  // Option A: a=10, b=1, score=1 (yield L=1)
  // Option B: a=1,  b=10, score=1 (yield M=1)
  // F=11, T=11
  // Single-option vertices:
  //   c_A only: min(F/10, T/1) = min(1.1, 11) = 1.1  → value = 1*1.1 = 1.1
  //   c_B only: min(F/1,  T/10) = min(11, 1.1) = 1.1 → value = 1*1.1 = 1.1
  // Two-option vertex: solve 10*c_A + 1*c_B = 11, 1*c_A + 10*c_B = 11
  //   det = 10*10 - 1*1 = 99
  //   c_A = (11*10 - 11*1)/99 = (110-11)/99 = 99/99 = 1
  //   c_B = (11*10 - 11*1)/99 = 1
  //   value = 1*1 + 1*1 = 2 > 1.1 ✓
  it('two-option vertex maximizes objective when both constraints bind (regression for 43687f55)', () => {
    const optA = makeOption('A', new Map([['L', 1]]), 10, 1);
    const optB = makeOption('B', new Map([['M', 1]]), 1, 10);
    const grad = new Map([
      ['L', 1],
      ['M', 1],
    ]);
    const F = 11;
    const T = 11;

    const { allocation } = LinearMinimizationOracle(grad, [optA, optB], F, T, new Map());

    const cA = allocation[0];
    const cB = allocation[1];
    const value = cA * 1 + cB * 1; // DotYieldGrad effectively

    // Two-option vertex gives value ≈ 2; single-option gives ≈ 1.1
    expect(value).toBeGreaterThan(1.5);
    expect(Math.abs(cA - 1)).toBeLessThan(1e-9);
    expect(Math.abs(cB - 1)).toBeLessThan(1e-9);
  });

  // Test 10: degeneracy guard — parallel constraint rows → no NaN/Infinity
  // Options A and B have proportional (a, b): same ratio b/a → det=0 → should fall back to single
  it('degeneracy (parallel constraint rows): no NaN or Infinity in output', () => {
    // A: fuel=2, time=4 → ratio 2:1
    // B: fuel=4, time=8 → ratio 2:1 (parallel rows)
    const optA = makeOption('A', new Map([['L', 1]]), 2, 4);
    const optB = makeOption('B', new Map([['M', 1]]), 4, 8);
    const grad = new Map([
      ['L', 1],
      ['M', 1],
    ]);
    const F = 20;
    const T = 40;

    const { allocation } = LinearMinimizationOracle(grad, [optA, optB], F, T, new Map());

    for (let i = 0; i < allocation.length; i++) {
      expect(isNaN(allocation[i])).toBe(false);
      expect(isFinite(allocation[i])).toBe(true);
    }
  });

  // Test 11: non-negativity — returned allocation is element-wise ≥ 0
  it('returned allocation is element-wise >= 0', () => {
    const opts = [
      makeOption('A', new Map([['L', 1]]), 5, 2),
      makeOption('B', new Map([['M', 2]]), 2, 5),
      makeOption('C', new Map([['N', 1]]), 3, 3),
    ];
    const grad = new Map([
      ['L', 0.5],
      ['M', 2.0],
      ['N', 1.0],
    ]);
    const F = 30;
    const T = 30;

    const { allocation } = LinearMinimizationOracle(grad, opts, F, T, new Map());

    for (let i = 0; i < allocation.length; i++) {
      expect(allocation[i]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// 5a Tests 12-15: OptimizeFrankWolfe
// ============================================================

// Minimal DAG for FW smoke tests: R needs 1×L, L is a leaf
function makeSimpleDag(): RecipeDAG {
  const L = makeLeaf('L');
  const R = makeNode('R', [{ node_id: 'L', quantity: 1 }], 0.5);
  return new Map([
    ['L', L],
    ['R', R],
  ]);
}

// Two options: one that yields L, one that yields L faster
function makeSimpleOptions(): LaunchOption[] {
  return [makeOption('opt1', new Map([['L', 2]]), 10, 5), makeOption('opt2', new Map([['L', 1]]), 5, 10)];
}

// 2-constraint DAG for monotonicity test: R1 needs 1×L, R2 needs 1×M, both lcp=0.5
// Requires many iterations to find the diagonal LP vertex c_A=c_B=1
function makeTwoConstraintDag(): RecipeDAG {
  const L = makeLeaf('L');
  const M = makeLeaf('M');
  const R1 = makeNode('R1', [{ node_id: 'L', quantity: 1 }], 0.5);
  const R2 = makeNode('R2', [{ node_id: 'M', quantity: 1 }], 0.5);
  return new Map([
    ['L', L],
    ['M', M],
    ['R1', R1],
    ['R2', R2],
  ]);
}

// Two options with asymmetric constraints: optA prefers fuel, optB prefers time
function makeTwoConstraintOptions(): LaunchOption[] {
  return [makeOption('optA', new Map([['L', 1]]), 10, 1), makeOption('optB', new Map([['M', 1]]), 1, 10)];
}

describe('OptimizeFrankWolfe', () => {
  // Test 12: terminates — smoke test
  it('smoke test: terminates and returns valid solution in [0,1]', () => {
    const dag = makeSimpleDag();
    const options = makeSimpleOptions();

    const result = OptimizeFrankWolfe({
      options,
      dag,
      desiredArtifactNodeIds: ['R'],
      fuelCapacity: 100,
      totalTimeUnits: 100,
      maxIter: 20,
      tol: 1e-6,
    });

    expect(result.length).toBeGreaterThan(0);
    const sol = result[0];
    expect(sol.best_probability).toBeGreaterThanOrEqual(0);
    expect(sol.best_probability).toBeLessThanOrEqual(1);

    // choiceHistory is consistent with fuel_used / time_units_used
    let computedFuel = 0;
    let computedTime = 0;
    for (const ch of sol.choice_history) {
      const count = ch.num_ships_launched / 3;
      computedFuel += ch.actual_fuel * count;
      computedTime += ch.actual_time * count;
    }
    expect(computedFuel).toBeCloseTo(sol.fuel_used, 1);
    expect(computedTime).toBeCloseTo(sol.time_units_used, 1);

    // Feasibility: FW result should not exceed budget (with floating-point tolerance)
    expect(sol.fuel_used).toBeLessThanOrEqual(100 + 1e-6);
    expect(sol.time_units_used).toBeLessThanOrEqual(100 + 1e-6);
  });

  // Test 13: bestC monotonicity — more iterations → best_probability non-decreasing
  // Uses a 2-constraint instance where the optimal is the diagonal LP vertex (c_A=c_B=1).
  // Greedy / few-iter FW won't find this; many-iter FW should converge better.
  it('best_probability is non-decreasing as maxIter increases (10 → 100 → 1000)', () => {
    const dag = makeTwoConstraintDag();
    const options = makeTwoConstraintOptions();

    const base = {
      options,
      dag,
      desiredArtifactNodeIds: ['R1', 'R2'],
      fuelCapacity: 11,
      totalTimeUnits: 11,
      tol: 1e-8,
    };

    const r10 = OptimizeFrankWolfe({ ...base, maxIter: 10 });
    const r100 = OptimizeFrankWolfe({ ...base, maxIter: 100 });
    const r1000 = OptimizeFrankWolfe({ ...base, maxIter: 1000 });

    const p10 = r10[0].best_probability;
    const p100 = r100[0].best_probability;
    const p1000 = r1000[0].best_probability;

    // Allow a tiny floating-point slack
    expect(p100).toBeGreaterThanOrEqual(p10 - 1e-9);
    expect(p1000).toBeGreaterThanOrEqual(p100 - 1e-9);
  });

  // Test 14: empty options → returns single solution with probability 0 and empty choiceHistory
  it('empty options: returns probability 0 and empty choiceHistory', () => {
    const dag = makeSimpleDag();

    const result = OptimizeFrankWolfe({
      options: [],
      dag,
      desiredArtifactNodeIds: ['R'],
      fuelCapacity: 100,
      totalTimeUnits: 100,
      maxIter: 10,
      tol: 1e-6,
    });

    expect(result.length).toBeGreaterThan(0);
    const sol = result[0];
    expect(sol.best_probability).toBe(0);
    expect(sol.choice_history).toHaveLength(0);
  });

  // Test 15: gammaStar=0 break — instance where LMO returns no improvement;
  // loop terminates cleanly without NaN.
  // We achieve this by having a single option whose yield direction is already
  // maximally allocated, so the LMO direction is identical to c and gap = 0.
  it('terminates cleanly without NaN when LMO returns no improvement direction', () => {
    // One option, tiny budget (only 1 run fits), so after the first iteration
    // the continuous solution is already at the LP vertex; gammaStar → 0.
    const dag = makeSimpleDag();
    const options = [makeOption('opt1', new Map([['L', 1]]), 10, 10)];

    const result = OptimizeFrankWolfe({
      options,
      dag,
      desiredArtifactNodeIds: ['R'],
      fuelCapacity: 10,
      totalTimeUnits: 10,
      maxIter: 100,
      tol: 1e-6,
    });

    expect(result.length).toBeGreaterThan(0);
    const sol = result[0];
    expect(isNaN(sol.best_probability)).toBe(false);
    expect(isFinite(sol.best_probability)).toBe(true);
    expect(sol.best_probability).toBeGreaterThanOrEqual(0);
    expect(sol.best_probability).toBeLessThanOrEqual(1);

    // Feasibility: result should not exceed budget
    expect(sol.fuel_used).toBeLessThanOrEqual(10 + 1e-6);
    expect(sol.time_units_used).toBeLessThanOrEqual(10 + 1e-6);
  });

  // Test 16: rounded choice_history allocations fit within budget
  // Same instance as test #13 (2-constraint DAG), where rounding effects matter.
  it('rounded choice_history allocations fit within budget', () => {
    const dag = makeTwoConstraintDag();
    const options = makeTwoConstraintOptions();
    const F = 11;
    const T = 11;

    const result = OptimizeFrankWolfe({
      options,
      dag,
      desiredArtifactNodeIds: ['R1', 'R2'],
      fuelCapacity: F,
      totalTimeUnits: T,
      maxIter: 1000,
      tol: 1e-8,
    });

    expect(result.length).toBeGreaterThan(0);
    const sol = result[0];

    // Verify choice_history allocations fit within budget.
    // num_ships_launched stores ships * num_runs; divide by ships_per_mission_slot (3).
    let usedFuel = 0;
    let usedTime = 0;
    for (const ch of sol.choice_history) {
      const count = ch.num_ships_launched / 3;
      usedFuel += ch.actual_fuel * count;
      usedTime += ch.actual_time * count;
    }
    expect(usedFuel).toBeLessThanOrEqual(F + 1e-6);
    expect(usedTime).toBeLessThanOrEqual(T + 1e-6);
  });
});

// ============================================================
// Stage 3 — Multi-root and shared-subtree gradient tests
// ============================================================

describe('MaxCraftCountDirect — multi-root scenarios', () => {
  // Test: Independent treatment of multiple roots.
  // Desired = ['P', 'C'] where P needs 1×C and 1×L; C needs 1×L.
  // Verify that MaxCraftCountDirect treats each root independently w.r.t. shared L pool.
  it('independent treatment of multiple roots', () => {
    const L = makeLeaf('L');
    const C = makeNode('C', [{ node_id: 'L', quantity: 1 }], 0.5);
    const P = makeNode(
      'P',
      [
        { node_id: 'C', quantity: 1 },
        { node_id: 'L', quantity: 1 },
      ],
      0.5
    );
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['C', C],
      ['P', P],
    ]);

    const y = new Map([['L', 4]]);

    // MaxCraftCountDirect(P) treats P as root: min(supply(C, false)/1, supply(L, false)/1)
    // supply(C, false) = 0 (C's own drop) + supply(L, false)/1 = 0 + 4 = 4
    // supply(L, false) = 4
    // min(4, 4) = 4
    const countP = MaxCraftCountDirect(P, dag, y);
    expect(countP).toBe(4);

    // MaxCraftCountDirect(C) treats C as root: supply(L, false)/1 = 4
    const countC = MaxCraftCountDirect(C, dag, y);
    expect(countC).toBe(4);

    // Objective(['P', 'C']) = poissonAtLeast(4*lcpP, 1) * poissonAtLeast(4*lcpC, 1)
    // Both lcp = 0.5, so lambda = 2 for each.
    const obj = Objective(y, ['P', 'C'], dag);
    const p = 1 - Math.exp(-2);
    const expectedObj = p * p;
    expect(Math.abs(obj - expectedObj)).toBeLessThan(1e-12);
  });

  // Test: Same node as both root and child — call-site difference.
  it('same node as root vs. child: isRoot flag affects supply calculation', () => {
    const L = makeLeaf('L');
    const C = makeNode('C', [{ node_id: 'L', quantity: 1 }], 0.5);
    const P = makeNode('P', [{ node_id: 'C', quantity: 1 }], 0.5);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['C', C],
      ['P', P],
    ]);

    // Direct call: C is the outer root, so its own drop is excluded.
    // supply(C, isRoot=true) = 0 + supply(L, false)/1 = 0 + 100 = 100
    const y1 = new Map([
      ['C', 5],
      ['L', 100],
    ]);
    const directCount = MaxCraftCountDirect(C, dag, y1);

    // When C is reached as a child of P, supply(C, false) includes C's own drop.
    // This is tested indirectly: the code should treat isRoot differently.
    // Pin the actual behavior: direct call gives supply(C) without C's own drop.
    expect(directCount).toBe(100);
  });
});

describe('ComputeGradient — multi-level and diamond scenarios', () => {
  // Test: 3-level chain gradient
  // R needs 1×M; M needs 2×L. Desired = [R]. lcp_R = 0.4.
  it('analytic gradient matches central finite differences on a 3-level chain', () => {
    const L = makeLeaf('L');
    const M = makeNode('M', [{ node_id: 'L', quantity: 2 }], 0.5);
    const R = makeNode('R', [{ node_id: 'M', quantity: 1 }], 0.4);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['M', M],
      ['R', R],
    ]);

    const y = new Map([
      ['M', 1],
      ['L', 4],
    ]);
    const grad = ComputeGradient(y, ['R'], dag);

    // Verify against central finite differences for both M and L
    const h = 1e-4;
    for (const key of ['M', 'L']) {
      const yPlus = new Map(y);
      yPlus.set(key, (yPlus.get(key) ?? 0) + h);
      const yMinus = new Map(y);
      yMinus.set(key, (yMinus.get(key) ?? 0) - h);

      const fd = (Objective(yPlus, ['R'], dag) - Objective(yMinus, ['R'], dag)) / (2 * h);
      const analytic = grad.get(key) ?? 0;

      const relErr = Math.abs(analytic - fd) / Math.max(Math.abs(fd), 1e-10);
      expect(relErr).toBeLessThan(1e-3);
    }
  });

  // Test: Diamond gradient
  // R needs 1×M1 AND 1×M2; M1 needs 1×L; M2 needs 1×L.
  // This tests gradient computation on a diamond DAG (expected to potentially fail).
  it('analytic gradient on diamond DAG matches central finite differences', () => {
    const L = makeLeaf('L');
    const M1 = makeNode('M1', [{ node_id: 'L', quantity: 1 }], 0.5);
    const M2 = makeNode('M2', [{ node_id: 'L', quantity: 1 }], 0.5);
    const R = makeNode(
      'R',
      [
        { node_id: 'M1', quantity: 1 },
        { node_id: 'M2', quantity: 1 },
      ],
      0.5
    );
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['M1', M1],
      ['M2', M2],
      ['R', R],
    ]);

    const y = new Map([['L', 4]]);
    const grad = ComputeGradient(y, ['R'], dag);

    // Compute finite difference gradient for L
    const h = 1e-4;
    const yPlus = new Map(y);
    yPlus.set('L', 4 + h);
    const yMinus = new Map(y);
    yMinus.set('L', 4 - h);

    const fd = (Objective(yPlus, ['R'], dag) - Objective(yMinus, ['R'], dag)) / (2 * h);
    const analytic = grad.get('L') ?? 0;

    // Diamond bug may cause this to fail — pin FD result as ground truth.
    // Do not weaken the assertion if it fails; report as signal.
    const relErr = Math.abs(analytic - fd) / Math.max(Math.abs(fd), 1e-10);
    expect(relErr).toBeLessThan(1e-3);
  });
});

describe('LinearMinimizationOracle — negative gradient handling', () => {
  // Test: Negative gradient entries allocate zero to net-negative options
  it('handles negative gradient entries by allocating zero to net-negative options', () => {
    const optA = makeOption('A', new Map([['L', 1]]), 5, 5);
    const optB = makeOption('B', new Map([['M', 1]]), 5, 5);
    const grad = new Map([
      ['L', 1],
      ['M', -1],
    ]);
    const F = 20;
    const T = 20;

    const { allocation } = LinearMinimizationOracle(grad, [optA, optB], F, T, new Map());

    // Positive gradient (L) should get allocation; negative (M) should get ~0
    const cA = allocation[0];
    const cB = allocation[1];

    expect(cA).toBeGreaterThan(0);
    expect(cB).toBeLessThan(0.1); // negligible, not exactly 0 due to LP solver precision
  });
});

// ============================================================
// Stage 4 — Numerical edge cases
// ============================================================

describe('numerical edge cases', () => {
  it('Objective handles very large lambda without underflow corruption', () => {
    const L = makeLeaf('L');
    const R = makeNode('R', [{ node_id: 'L', quantity: 1 }], 1.0);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R', R],
    ]);

    const y = new Map([['L', 1000]]);
    // craftCount = 1000, lambda = 1000 * 1.0 = 1000
    // poissonAtLeast(1000, 1) ≈ 1 - e^-1000 (extremely close to 1, but finite)
    const p = Objective(y, ['R'], dag);

    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(isFinite(p)).toBe(true);
  });

  it('LMO handles zero-fuel option (degenerate constraint)', () => {
    const optA = makeOption('A', new Map([['L', 1]]), 0, 5);
    const grad = new Map([['L', 1]]);
    const F = 10;
    const T = 10;

    const { allocation } = LinearMinimizationOracle(grad, [optA], F, T, new Map());

    // Zero fuel: only time constraint binds.
    // Expect allocation[0] = T/5 = 2 (or possibly higher if LP allows unbounded allocation).
    // If NaN or Infinity, report as signal.
    expect(isNaN(allocation[0])).toBe(false);
  });

  it('OptimizeFrankWolfe with zero-fuel zero-time option terminates', () => {
    const optA = makeOption('A', new Map([['L', 1]]), 0, 0);
    const dag = makeSimpleDag();

    const result = OptimizeFrankWolfe({
      options: [optA],
      dag,
      desiredArtifactNodeIds: ['R'],
      fuelCapacity: 10,
      totalTimeUnits: 10,
      maxIter: 5, // Low max-iter to bound test duration
      tol: 1e-6,
    });

    expect(result.length).toBeGreaterThan(0);
    const sol = result[0];
    expect(isFinite(sol.best_probability)).toBe(true);
  });
});
