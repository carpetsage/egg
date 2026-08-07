import { describe, expect, test } from 'vitest';
import { reconstructPlan } from './reconstruct';
import { makeTestContext } from './testFixtures';
import type { BeamSearchState, BeamTerminalResult } from './types';

const context = makeTestContext();

function baseState(overrides: Partial<BeamSearchState> = {}): BeamSearchState {
  return {
    parent: null,
    purchase: null,
    phase: 1,
    researchLevels: {},
    bankValue: 0,
    population: 0,
    lastStepTime: 0,
    eggsDelivered: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    fuelTankAmounts: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    teEarned: { curiosity: 0, integrity: 0, humility: 0, resilience: 0, kindness: 0 },
    activeSales: { research: false, hab: false, vehicle: false },
    earningsBoost: { active: false, multiplier: 1 },
    ...overrides,
  };
}

describe('reconstructPlan', () => {
  test('flattens a chain of ordinary purchases, a tier macro, a phase transition, and Phase 3 in order', () => {
    // root -> [research a] -> [tierMacro: b, c] -> [phaseTransition] -> [research d]  --(Phase3: e, f)--> terminal
    const root = baseState({ lastStepTime: 0 });
    const s1 = baseState({
      parent: root,
      lastStepTime: 100,
      purchase: { kind: 'research', researchId: 'a', toLevel: 1 },
    });
    const s2 = baseState({
      parent: s1,
      lastStepTime: 200,
      purchase: { kind: 'tierMacro', tier: 2, researchIds: ['b', 'c'] },
    });
    const s3 = baseState({
      parent: s2,
      lastStepTime: 200,
      phase: 2,
      purchase: { kind: 'phaseTransition' },
    });
    const s4 = baseState({
      parent: s3,
      lastStepTime: 300,
      phase: 2,
      purchase: { kind: 'research', researchId: 'd', toLevel: 1 },
    });

    const result: BeamTerminalResult = {
      state: s4,
      edge: {
        kind: 'phase3Macro',
        researchIds: ['e', 'f'],
        finalLevels: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 },
        finalScore: 42,
      },
      lastPurchaseTime: 999,
    };

    const plan = reconstructPlan(result, context);

    expect(plan.researchIds).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(plan.endLevels).toEqual({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 });
    expect(plan.score).toBe(42);
    expect(plan.lastPurchaseTime).toBe(999);
    expect(plan.tierUnlockTimes).toEqual([{ tier: 2, time: context.ascensionStartTime + 200 }]);
    expect(plan.phaseTransitionTime).toBe(context.ascensionStartTime + 200);
  });

  test('a plan that never left phase 1 reports phaseTransitionTime as null', () => {
    const root = baseState();
    const s1 = baseState({ parent: root, purchase: { kind: 'research', researchId: 'a', toLevel: 1 } });

    const result: BeamTerminalResult = {
      state: s1,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: { a: 1 }, finalScore: 1 },
      lastPurchaseTime: 0,
    };

    const plan = reconstructPlan(result, context);
    expect(plan.phaseTransitionTime).toBeNull();
    expect(plan.tierUnlockTimes).toEqual([]);
  });

  test('a terminal result with no parent chain (Phase 3 run directly from the root) still works', () => {
    const root = baseState();
    const result: BeamTerminalResult = {
      state: root,
      edge: { kind: 'phase3Macro', researchIds: ['x'], finalLevels: { x: 1 }, finalScore: 7 },
      lastPurchaseTime: 5,
    };

    const plan = reconstructPlan(result, context);
    expect(plan.researchIds).toEqual(['x']);
    expect(plan.phaseTransitionTime).toBeNull();
    expect(plan.tierUnlockTimes).toEqual([]);
  });
});
