import { describe, expect, test } from 'vitest';
import { reconstructPlan } from './reconstruct';
import { makeTestContext } from './testFixtures';
import type { RankedState } from './search';
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

  test('a waitForSale edge adds nothing to researchIds but is recorded in saleWaitTimes', () => {
    // root -> [research a] -> [waitForSale] -> [research b]  --(Phase3: c)--> terminal
    const root = baseState({ lastStepTime: 0 });
    const s1 = baseState({
      parent: root,
      lastStepTime: 100,
      purchase: { kind: 'research', researchId: 'a', toLevel: 1 },
    });
    const s2 = baseState({
      parent: s1,
      lastStepTime: 300,
      purchase: { kind: 'waitForSale' },
      activeSales: { research: true, hab: false, vehicle: false },
    });
    const s3 = baseState({
      parent: s2,
      lastStepTime: 350,
      purchase: { kind: 'research', researchId: 'b', toLevel: 1 },
    });

    const result: BeamTerminalResult = {
      state: s3,
      edge: { kind: 'phase3Macro', researchIds: ['c'], finalLevels: { a: 1, b: 1, c: 1 }, finalScore: 3 },
      lastPurchaseTime: 400,
    };

    const plan = reconstructPlan(result, context);
    expect(plan.researchIds).toEqual(['a', 'b', 'c']);
    expect(plan.saleWaitTimes).toEqual([context.ascensionStartTime + 300]);
  });

  test('saleWaitTimes is empty for a plan that never needed to wait', () => {
    const root = baseState();
    const s1 = baseState({ parent: root, purchase: { kind: 'research', researchId: 'a', toLevel: 1 } });
    const result: BeamTerminalResult = {
      state: s1,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: { a: 1 }, finalScore: 1 },
      lastPurchaseTime: 0,
    };
    expect(reconstructPlan(result, context).saleWaitTimes).toEqual([]);
  });
});

/**
 * The winning-path trace (../HANDOFF.md's tooling option #2) — built only when the caller supplies
 * `traceInputs`, cross-referencing the winning chain against synthetic `generationTraces` snapshots
 * the same way engine/index.ts wires up real ones from runSearchLoop's own capture.
 */
describe('reconstructPlan trace', () => {
  // elr is irrelevant to these tests (trace/chosenRank plumbing, not selectBeamSurvivors' own
  // elr-based selection — that's covered separately in search.spec.ts), so a fixed placeholder is
  // fine here.
  function ranked(state: BeamSearchState, earnings: number): RankedState {
    return { state, earnings, elr: 0 };
  }

  test('omits trace entirely when traceInputs is not passed', () => {
    const root = baseState();
    const s1 = baseState({ parent: root, purchase: { kind: 'research', researchId: 'a', toLevel: 1 } });
    const result: BeamTerminalResult = {
      state: s1,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: { a: 1 }, finalScore: 1 },
      lastPurchaseTime: 0,
    };

    expect(reconstructPlan(result, context).trace).toBeUndefined();
  });

  test('reports chosenRank, alternatives, and the final step against synthetic generation snapshots', () => {
    // Two generations: root -> s1 (research a) -> s2 (research b, terminal via Phase 3).
    const root = baseState();
    const s1 = baseState({ parent: root, purchase: { kind: 'research', researchId: 'a', toLevel: 1 } });
    const s2 = baseState({ parent: s1, purchase: { kind: 'research', researchId: 'b', toLevel: 1 } });

    // Decoys sharing generation 1 with s1 — s1 itself is the middle earner (rank 2 of 3).
    const decoy1a = baseState({ parent: root, purchase: { kind: 'research', researchId: 'x', toLevel: 1 } });
    const decoy1b = baseState({ parent: root, purchase: { kind: 'research', researchId: 'y', toLevel: 1 } });
    // A lone decoy sharing generation 2 with s2 — s2 is the top earner (rank 1 of 2) there.
    const decoy2 = baseState({ parent: s1, purchase: { kind: 'research', researchId: 'z', toLevel: 1 } });

    const generationTraces = new Map<number, RankedState[]>([
      [1, [ranked(decoy1a, 300), ranked(s1, 200), ranked(decoy1b, 100)]],
      [2, [ranked(s2, 50), ranked(decoy2, 10)]],
    ]);

    const winner: BeamTerminalResult = {
      state: s2,
      edge: { kind: 'phase3Macro', researchIds: ['c'], finalLevels: { a: 1, b: 1, c: 1 }, finalScore: 99 },
      lastPurchaseTime: 500,
    };
    // Two other complete plans the search also found, one better-scoring than the winner (so
    // winnerRank isn't trivially 1) and one worse.
    const betterRival: BeamTerminalResult = {
      state: decoy2,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 150 },
      lastPurchaseTime: 400,
    };
    const worseRival: BeamTerminalResult = {
      state: decoy1a,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 5 },
      lastPurchaseTime: 300,
    };
    const finished = [worseRival, winner, betterRival];

    const plan = reconstructPlan(winner, context, { finished, generationTraces });

    expect(plan.trace).toBeDefined();
    const trace = plan.trace!;
    expect(trace.steps).toHaveLength(2);

    const [step1, step2] = trace.steps;
    expect(step1.depth).toBe(1);
    expect(step1.chosen.purchase).toEqual({ kind: 'research', researchId: 'a', toLevel: 1 });
    expect(step1.chosen.earnings).toBe(200);
    expect(step1.chosenRank).toBe(2); // decoy1a (300) > s1 (200) > decoy1b (100)
    expect(step1.beamSizeThisGeneration).toBe(3);
    expect(step1.alternatives.map(a => a.earnings)).toEqual([300, 100]); // both decoys, s1 excluded

    expect(step2.depth).toBe(2);
    expect(step2.chosen.purchase).toEqual({ kind: 'research', researchId: 'b', toLevel: 1 });
    expect(step2.chosenRank).toBe(1); // s2 (50) > decoy2 (10)
    expect(step2.beamSizeThisGeneration).toBe(2);
    expect(step2.alternatives.map(a => a.earnings)).toEqual([10]);

    expect(trace.finalStep.finalScore).toBe(99);
    expect(trace.finalStep.totalPhase3AttemptsFound).toBe(3);
    expect(trace.finalStep.winnerRank).toBe(2); // betterRival (150) > winner (99) > worseRival (5)
    expect(trace.finalStep.otherAttempts.map(a => a.finalScore)).toEqual([150, 5]);
  });

  test('caps alternatives at the fixed limit even with many decoys in the beam', () => {
    const root = baseState();
    const chosen = baseState({ parent: root, purchase: { kind: 'research', researchId: 'chosen', toLevel: 1 } });
    const decoys = Array.from({ length: 12 }, (_, i) =>
      baseState({ parent: root, purchase: { kind: 'research', researchId: `decoy${i}`, toLevel: 1 } })
    );
    const generationTraces = new Map<number, RankedState[]>([
      [1, [ranked(chosen, 1000), ...decoys.map((d, i) => ranked(d, 900 - i))]],
    ]);
    const winner: BeamTerminalResult = {
      state: chosen,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 1 },
      lastPurchaseTime: 0,
    };

    const plan = reconstructPlan(winner, context, { finished: [winner], generationTraces });

    expect(plan.trace!.steps[0].beamSizeThisGeneration).toBe(13);
    expect(plan.trace!.steps[0].alternatives.length).toBeLessThanOrEqual(5);
  });

  // Regression test for a real bug found via a live exported trace (see ../HANDOFF.md's "Live
  // verification"): winnerRank was computed by sorting `finished` on score alone, which disagreed
  // with engine/index.ts's `pickWinner` (score desc, then earliest lastPurchaseTime) whenever
  // multiple attempts tied on score — a common occurrence in practice once the score plateaus (see
  // HANDOFF's convergence notes). winnerRank must always be 1: `winner` passed into
  // buildWinningPathTrace is always exactly what pickWinner itself selected.
  test("winnerRank is always 1 when several finished attempts tie on score, matching pickWinner's own tiebreak", () => {
    const root = baseState();
    const chosen = baseState({ parent: root, purchase: { kind: 'research', researchId: 'a', toLevel: 1 } });
    const generationTraces = new Map<number, RankedState[]>([[1, [ranked(chosen, 10)]]]);

    // Same finalScore as the winner, but pickWinner would only prefer one over the winner if its
    // lastPurchaseTime were strictly earlier — none of these are, so `winner` (lastPurchaseTime 500)
    // really is pickWinner's pick despite the tie.
    const tiedButLater1: BeamTerminalResult = {
      state: baseState({ parent: root }),
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 99 },
      lastPurchaseTime: 900,
    };
    const tiedButLater2: BeamTerminalResult = {
      state: baseState({ parent: root }),
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 99 },
      lastPurchaseTime: 700,
    };
    const winner: BeamTerminalResult = {
      state: chosen,
      edge: { kind: 'phase3Macro', researchIds: [], finalLevels: {}, finalScore: 99 },
      lastPurchaseTime: 500,
    };
    // Deliberately NOT sorted — winner appears after both tied rivals in insertion order, so a naive
    // score-only sort with a stable tiebreak would have put a rival first.
    const finished = [tiedButLater1, tiedButLater2, winner];

    const plan = reconstructPlan(winner, context, { finished, generationTraces });

    expect(plan.trace!.finalStep.winnerRank).toBe(1);
    expect(plan.trace!.finalStep.otherAttempts.map(a => a.lastPurchaseTime)).toEqual([700, 900]);
  });
});
