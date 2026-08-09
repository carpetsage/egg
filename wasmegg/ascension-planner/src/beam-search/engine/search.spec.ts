import { describe, expect, test } from 'vitest';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getNextPacificTime } from '@/lib/events';
import { fastForwardToSale, runSearchLoop, selectCandidates } from './search';
import { absoluteSimTimeOf, splitEngineState } from './types';
import { makeTestContext, makeTestEngineState } from './testFixtures';
import type { LightweightCandidate } from './candidates';

/**
 * Cancellation for Phase B's Web Worker (see ../HANDOFF.md) — `isCancelled` is polled once per
 * generation (BeamSearchOptions.isCancelled's doc comment explains why that granularity), so these
 * tests check the loop stops within a generation or two of `isCancelled` starting to return true,
 * not instantly mid-generation.
 */
describe('runSearchLoop cancellation', () => {
  function buildArgs() {
    const context = makeTestContext();
    const startState = makeTestEngineState();
    const { frozen, initial } = splitEngineState(startState);
    const mods = {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: calculateArtifactModifiers(frozen.artifactLoadout).researchCost.totalMultiplier,
    };
    // Deliberately generous — big enough that, left uncancelled, the loop would run for many more
    // generations than the cancellation tests below let it.
    const deadline = context.ascensionStartTime + 30 * 24 * 3600;
    return { context, initial, frozen, mods, deadline };
  }

  test('isCancelled true from the start stops before any generation runs', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();
    const result = runSearchLoop(initial, frozen, context, mods, deadline, 5, 500, undefined, () => true);

    expect(result.metrics.cancelled).toBe(true);
    expect(result.metrics.depthReached).toBe(0);
    expect(result.metrics.statesExpanded).toBe(0);
    expect(result.finished).toEqual([]);
  });

  test('isCancelled flipping true after the first generation stops well short of maxDepth', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();
    let generations = 0;
    const result = runSearchLoop(initial, frozen, context, mods, deadline, 5, 500, undefined, () => {
      // False for the check before generation 1, true from generation 2 onward.
      return generations++ >= 1;
    });

    expect(result.metrics.cancelled).toBe(true);
    expect(result.metrics.depthReached).toBe(1);
    expect(result.metrics.depthReached).toBeLessThan(500);
  });

  test('an uncancelled run reports cancelled: false', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();
    // maxDepth caps this to a handful of generations regardless — this is a correctness check on
    // the flag, not a performance benchmark (see convergence.spec.ts for that).
    const result = runSearchLoop(initial, frozen, context, mods, deadline, 5, 3);

    expect(result.metrics.cancelled).toBe(false);
  });
});

/**
 * Diagnostics tooling (../HANDOFF.md's "Live verification"/tooling options #1 and #2): the new
 * cumulative progress counters, and the opt-in per-generation trace capture.
 */
describe('runSearchLoop diagnostics', () => {
  function buildArgs() {
    const context = makeTestContext();
    const startState = makeTestEngineState();
    const { frozen, initial } = splitEngineState(startState);
    const mods = {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: calculateArtifactModifiers(frozen.artifactLoadout).researchCost.totalMultiplier,
    };
    const deadline = context.ascensionStartTime + 6 * 3600; // small, matches index.spec.ts's smoke test
    return { context, initial, frozen, mods, deadline };
  }

  test('candidatesGenerated/tierMacroSuccesses/phase3MacroSuccesses/finishedCount are cumulative and consistent', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();
    const progressCalls: import('./types').BeamSearchProgress[] = [];
    const result = runSearchLoop(initial, frozen, context, mods, deadline, 5, 8, p => progressCalls.push(p));

    expect(progressCalls.length).toBeGreaterThan(0);
    // Every *Successes/*Calls counter is monotonically non-decreasing generation to generation
    // (they're running totals, same convention as the pre-existing counters) and successes never
    // exceed their own attempt count.
    for (let i = 1; i < progressCalls.length; i++) {
      expect(progressCalls[i].candidatesGenerated).toBeGreaterThanOrEqual(progressCalls[i - 1].candidatesGenerated);
      expect(progressCalls[i].tierMacroSuccesses).toBeGreaterThanOrEqual(progressCalls[i - 1].tierMacroSuccesses);
      expect(progressCalls[i].phase3MacroSuccesses).toBeGreaterThanOrEqual(progressCalls[i - 1].phase3MacroSuccesses);
      expect(progressCalls[i].finishedCount).toBeGreaterThanOrEqual(progressCalls[i - 1].finishedCount);
    }
    const last = progressCalls[progressCalls.length - 1];
    expect(last.tierMacroSuccesses).toBeLessThanOrEqual(last.tierMacroCalls);
    expect(last.phase3MacroSuccesses).toBeLessThanOrEqual(last.phase3MacroCalls);
    // finishedCount tracks the same array runSearchLoop returns as `finished`.
    expect(last.finishedCount).toBe(result.finished.length);
    // At least one successor was generated every generation this ran (a fresh state always has
    // ordinary research candidates and/or a phase transition available).
    expect(last.candidatesGenerated).toBeGreaterThan(0);
  });

  test('generationTraces is absent by default and present (one entry per generation) when trace is true', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();

    const withoutTrace = runSearchLoop(initial, frozen, context, mods, deadline, 5, 8);
    expect(withoutTrace.generationTraces).toBeUndefined();

    const withTrace = runSearchLoop(initial, frozen, context, mods, deadline, 5, 8, undefined, undefined, true);
    expect(withTrace.generationTraces).toBeDefined();
    expect(withTrace.generationTraces!.size).toBe(withTrace.metrics.depthReached);
    for (const [depth, beam] of withTrace.generationTraces!) {
      expect(depth).toBeGreaterThanOrEqual(1);
      expect(beam.length).toBeGreaterThan(0);
      expect(beam.length).toBeLessThanOrEqual(5); // beamWidth used above
      // Every captured member has a real purchase — the untouched initial state is never captured
      // (see WinningPathTrace's doc comment in types.ts).
      for (const ranked of beam) {
        expect(ranked.state.purchase).not.toBeNull();
      }
    }
  });

  test('trace: true does not change the search outcome, only what gets additionally recorded', () => {
    const { initial, frozen, context, mods, deadline } = buildArgs();
    const withoutTrace = runSearchLoop(initial, frozen, context, mods, deadline, 5, 8);
    const withTrace = runSearchLoop(initial, frozen, context, mods, deadline, 5, 8, undefined, undefined, true);

    expect(withTrace.finished.length).toBe(withoutTrace.finished.length);
    expect(withTrace.metrics.depthReached).toBe(withoutTrace.metrics.depthReached);
    expect(withTrace.metrics.statesExpanded).toBe(withoutTrace.metrics.statesExpanded);
  });
});

/**
 * selectCandidates no longer falls back to the unfiltered candidate list when nothing clears 70% —
 * see ../HANDOFF.md and this function's own doc comment for why (a real diagnostics session found
 * the old fallback let the search settle for a weak purchase instead of waiting for the sale
 * discount, matching a human's own natural instinct). This is a pure, deterministic function over a
 * plain array, so tested directly with hand-built candidates rather than needing real game state to
 * organically produce a "nothing clears 70%" situation (found, while building this test, to be
 * surprisingly hard to trigger via real fixtures — getSaleAwareTimeToSave's own sale-aware pricing
 * routinely pulls a candidate into meets70 via `duringSale` once a sale is within its wait window,
 * which is itself a reassuring sign this is a genuine edge case, not a common one).
 */
describe('selectCandidates', () => {
  function candidate(overrides: Partial<LightweightCandidate>): LightweightCandidate {
    return {
      researchId: 'x',
      fromLevel: 0,
      toLevel: 1,
      price: 100,
      waitSeconds: 0,
      duringSale: false,
      earningsDelta: 10,
      meets70: false,
      ...overrides,
    };
  }

  test('returns only the candidates that meet 70%', () => {
    const a = candidate({ researchId: 'a', meets70: true });
    const b = candidate({ researchId: 'b', meets70: false });
    const c = candidate({ researchId: 'c', meets70: true });

    expect(selectCandidates([a, b, c])).toEqual([a, c]);
  });

  test('returns an empty array — not the unfiltered input — when nothing meets 70%', () => {
    const candidates = [candidate({ researchId: 'a' }), candidate({ researchId: 'b' })];
    expect(selectCandidates(candidates)).toEqual([]);
  });

  test('returns an empty array for an empty input', () => {
    expect(selectCandidates([])).toEqual([]);
  });
});

describe('fastForwardToSale', () => {
  function buildArgs() {
    const context = makeTestContext();
    const startState = makeTestEngineState();
    const { frozen, initial } = splitEngineState(startState);
    return { context, initial, frozen };
  }

  test('lands exactly at nextSaleStart, with the research sale flipped on', () => {
    const { context, initial, frozen } = buildArgs();
    const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTimeOf(initial, context));

    const result = fastForwardToSale(initial, frozen, context, nextSaleStart);

    expect(result.purchase).toEqual({ kind: 'waitForSale' });
    expect(result.parent).toBe(initial);
    expect(absoluteSimTimeOf(result, context)).toBeCloseTo(nextSaleStart, 6);
    expect(result.activeSales.research).toBe(true);
    // Untouched by this edge — no purchase was made.
    expect(result.researchLevels).toEqual(initial.researchLevels);
  });

  test('accrues gems over the wait (a multi-day wait with positive earnings should grow the bank)', () => {
    const { context, initial, frozen } = buildArgs();
    const nextSaleStart = getNextPacificTime(5, 9, absoluteSimTimeOf(initial, context));

    const result = fastForwardToSale(initial, frozen, context, nextSaleStart);

    expect(result.bankValue).toBeGreaterThan(initial.bankValue);
  });

  test('correctly reflects an earnings boost active at the arrival time, not the departure time', () => {
    const { context, initial, frozen } = buildArgs();
    // A boost active at arrival implies the wait crossed into (or already started inside) a boost
    // window — pick nextEarningsBoostStart itself as the target so the arrival moment is
    // unambiguously boost-active, whatever the departure state was.
    const boostStart = getNextPacificTime(1, 9, absoluteSimTimeOf(initial, context));

    const result = fastForwardToSale(initial, frozen, context, boostStart);

    expect(result.earningsBoost).toEqual({ active: true, multiplier: 2 });
  });
});
