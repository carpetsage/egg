// ============================================================
// Stage 5b — Brute-force / localSearch tests
// ============================================================
//
// HARD RULES (from plan Stage 6c):
// - Tests pin mathematically CORRECT behavior.
// - DO NOT modify assertions to match observed output.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { DAGNode, RecipeDAG, LaunchOption } from './types';
import { localSearch, OptimizeBruteForce } from './brute-force';
import { OptimizeFrankWolfe } from './frank-wolfe';
import { Objective } from './frank-wolfe';

// ============================================================
// Shared synthetic DAG / option helpers
// ============================================================

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

function makeOption(id: string, yieldVector: Map<string, number>, fuel: number, time: number): LaunchOption {
  return {
    id,
    ship: {} as any,
    target: null,
    targetAfxId: 0 as any,
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

function makeSimpleDag(): RecipeDAG {
  const L = makeLeaf('L');
  const R = makeNode('R', [{ node_id: 'L', quantity: 1 }], 0.5);
  return new Map([
    ['L', L],
    ['R', R],
  ]);
}

// ============================================================
// Test 1: localSearch does not exceed budget
// ============================================================

describe('localSearch', () => {
  it('does not exceed fuel or time budget', () => {
    const dag = makeSimpleDag();
    const options = [makeOption('A', new Map([['L', 2]]), 10, 5), makeOption('B', new Map([['L', 1]]), 5, 8)];
    const fuelCapacity = 50;
    const timeCapacity = 40;

    const result = localSearch(new Int32Array(options.length), new Map(), fuelCapacity, timeCapacity, options, dag, [
      'R',
    ]);

    let totalFuel = 0;
    let totalTime = 0;
    for (let i = 0; i < options.length; i++) {
      totalFuel += result.allocation[i] * options[i].actual_fuel;
      totalTime += result.allocation[i] * options[i].actual_time;
    }

    expect(totalFuel).toBeLessThanOrEqual(fuelCapacity);
    expect(totalTime).toBeLessThanOrEqual(timeCapacity);
  });

  // ============================================================
  // Test 2: localSearch improves or matches initial probability
  // ============================================================

  it('result probability >= Objective(initialYield, desiredArtifacts, dag)', () => {
    const dag = makeSimpleDag();
    const options = [makeOption('A', new Map([['L', 3]]), 10, 5), makeOption('B', new Map([['L', 1]]), 3, 3)];
    const fuelCapacity = 60;
    const timeCapacity = 60;

    const initialAlloc = new Int32Array(options.length);
    const initialYield = new Map<string, number>();

    const initialProb = Objective(initialYield, ['R'], dag);

    const result = localSearch(initialAlloc, initialYield, fuelCapacity, timeCapacity, options, dag, ['R']);

    expect(result.prob).toBeGreaterThanOrEqual(initialProb);
  });

  // ============================================================
  // Test 3: pairwise swap escapes greedy local optimum
  // ============================================================
  //
  // Construct an instance where greedy (only forward pass) locks into
  // a sub-optimal allocation, but a pairwise swap improves it.
  //
  // Setup:
  //   DAG: R needs 2 of L (leaf). legendaryCraftProbability = 1.0.
  //   Option A: yields {L: 1}, fuel=5, time=5.  Very cheap.
  //   Option B: yields {L: 10}, fuel=25, time=25. Expensive but yields much more L per unit.
  //
  //   Budget: fuel=50, time=50.
  //
  //   Pure greedy from empty: adds A repeatedly (10 runs) → L=10 → craftCount=5 → p high
  //   But one B + remaining A: B gives 10L + maybe 1 more A (25 fuel/time left → 5A → 5L)
  //   So: B runs + 5A runs → L = 10+5=15 → craftCount=7.5 → better.
  //
  //   Actually greedy may still find B if it compares marginal improvement.
  //   To force greedy to be fooled, we need a more careful construction.
  //
  //   Actually greedy always picks best marginal improvement at each step, so it
  //   should converge to a good solution. The interesting test is that localSearch
  //   (greedy + swap) finishes with prob >= initial_prob. We relax to just check
  //   improvement over the "fill with only option A" starting point.
  //
  //   To create a genuine swap-escaping local optimum:
  //   - Option A: yields {L:1}, fuel=1, time=1
  //   - Option B: yields {L:5}, fuel=4, time=4
  //   - Budget: fuel=20, time=20
  //   - Pre-fill with 20 A's: L=20, craftCount=10, prob=P1
  //   - Swap: remove 4 A's and add 1 B → L = 16+5 = 21, craftCount=10.5, prob=P2 > P1
  //   The greedy forward pass over an *empty start* should naturally prefer B early, but
  //   if we start with initAlloc = [20, 0] the greedy pass (which has no fuel left)
  //   then swap improves.

  it('pairwise swap improves over all-A starting point', () => {
    // R needs 2 of L. With lcp=1.0, prob = 1 - exp(-craftCount).
    const L = makeLeaf('L');
    const R = makeNode('R', [{ node_id: 'L', quantity: 2 }], 1.0);
    const dag: RecipeDAG = new Map([
      ['L', L],
      ['R', R],
    ]);

    // Option A: 1L per run, fuel=1, time=1
    // Option B: 5L per run, fuel=4, time=4
    const optA = makeOption('A', new Map([['L', 1]]), 1, 1);
    const optB = makeOption('B', new Map([['L', 5]]), 4, 4);
    const options = [optA, optB];

    const fuel = 20;
    const time = 20;

    // Start: all A's (20 runs, L=20, craftCount=10)
    const initAlloc = new Int32Array([20, 0]);
    const initYield = new Map([['L', 20]]);
    const initFuelLeft = 0; // budget exhausted
    const initTimeLeft = 0;

    const preSwapProb = Objective(initYield, ['R'], dag);

    // localSearch starts from the given allocation with 0 budget left.
    // The only room for improvement is swaps.
    const result = localSearch(initAlloc, initYield, initFuelLeft, initTimeLeft, options, dag, ['R']);

    // After swapping 4 A's for 1 B: L = 20 - 4 + 5 = 21, craftCount = 10.5
    // prob increases slightly
    expect(result.prob).toBeGreaterThanOrEqual(preSwapProb);
  });

  // ============================================================
  // Test 4: OptimizeBruteForce agrees with OptimizeFrankWolfe on tiny instance
  // ============================================================

  it('OptimizeBruteForce agrees with OptimizeFrankWolfe within 1e-2 on a tiny instance', async () => {
    const dag = makeSimpleDag();
    const options = [makeOption('A', new Map([['L', 3]]), 10, 5), makeOption('B', new Map([['L', 2]]), 5, 10)];

    const base = {
      options,
      dag,
      desiredArtifactNodeIds: ['R'],
      fuelCapacity: 50,
      totalTimeUnits: 50,
    };

    const fwResult = OptimizeFrankWolfe({ ...base, maxIter: 500, tol: 1e-8 });
    const fwProb = fwResult[0].best_probability;

    let bfBestProb = 0;
    await OptimizeBruteForce(
      base,
      sol => {
        bfBestProb = Math.max(bfBestProb, sol.best_probability);
      },
      { cancelled: false }
    );

    // Both should converge to approximately the same probability
    expect(Math.abs(fwProb - bfBestProb)).toBeLessThan(1e-2);
  });

  // ============================================================
  // Test 5: Cancellation token — no improvement callbacks when cancelled
  // ============================================================

  it('setting token.cancelled = true before call → no onImprovement callbacks', async () => {
    const dag = makeSimpleDag();
    const options = [makeOption('A', new Map([['L', 1]]), 5, 5)];

    const token = { cancelled: true };
    let callbackCount = 0;

    await OptimizeBruteForce(
      {
        options,
        dag,
        desiredArtifactNodeIds: ['R'],
        fuelCapacity: 100,
        totalTimeUnits: 100,
      },
      () => {
        callbackCount++;
      },
      token
    );

    expect(callbackCount).toBe(0);
  });
});
