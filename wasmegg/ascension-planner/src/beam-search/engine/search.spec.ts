import { describe, expect, test } from 'vitest';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getNextPacificTime } from '@/lib/events';
import {
  fastForwardToSale,
  runSearchLoop,
  selectBeamSurvivors,
  selectCandidates,
  selectPhase3Eligible,
  type RankedState,
} from './search';
import { absoluteSimTimeOf, splitEngineState, type BeamSearchState } from './types';
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

/**
 * selectPhase3Eligible's earnings-ranked/stratified split — see ../HANDOFF.md's "Algorithm
 * improvements" §5 for the real trace analysis this was built to address (a branch ranked 54th by
 * earnings never got a real Phase 3 score under a pure top-N throttle, despite eventually producing
 * the winning plan). `genetic_purification` (egg_value category) is used to build members with a
 * clean, known earnings ordering — confirmed directly (a throwaway debug check, not assumed) that it
 * moves `offlineEarnings` cleanly in this fixture, unlike an egg_laying_rate research like
 * `comfy_nests`, which left `offlineEarnings` completely unchanged across every level tried:
 * `rankByEarnings` ranks by `offlineEarnings` specifically (not `elr`), and that figure isn't driven
 * by laying rate the way delivery rate is.
 */
describe('selectPhase3Eligible', () => {
  const context = makeTestContext();
  const { frozen } = splitEngineState(makeTestEngineState());

  /** `members[i]` has strictly increasing offlineEarnings as `i` increases (genetic_purification
   *  level = `i * 5`), so `members[members.length - 1]` is always the single top earner and
   *  `members[0]` is always the single lowest earner. */
  function makeMembers(count: number): BeamSearchState[] {
    return Array.from({ length: count }, (_, i) => {
      const { initial } = splitEngineState(makeTestEngineState({ researchLevels: { genetic_purification: i * 5 } }));
      return { ...initial, phase: 2 as const };
    });
  }

  test('empty phase2Members returns an empty set', () => {
    expect(selectPhase3Eligible([], frozen, context, 4, 0)).toEqual(new Set());
  });

  test('a non-positive budget returns an empty set', () => {
    const members = makeMembers(4);
    expect(selectPhase3Eligible(members, frozen, context, 0, 0).size).toBe(0);
    expect(selectPhase3Eligible(members, frozen, context, -1, 0).size).toBe(0);
  });

  test('a budget covering every member includes everyone, earnings-ranked slice included', () => {
    const members = makeMembers(4);
    const eligible = selectPhase3Eligible(members, frozen, context, 4, 0);
    expect(eligible.size).toBe(4);
    for (const m of members) expect(eligible.has(m)).toBe(true);
  });

  test('earnings-ranked half includes the top earner even when the stratified half would not reach it yet', () => {
    const members = makeMembers(6);
    const topEarner = members[5];
    // budget 2 -> earnersBudget 1, diverseBudget 1. windowStart at generation 0 is index 0, nowhere
    // near the top earner's index (5) — only the earnings-ranked half can be responsible for its
    // inclusion here.
    const eligible = selectPhase3Eligible(members, frozen, context, 2, 0);
    expect(eligible.has(topEarner)).toBe(true);
  });

  test('the stratified half includes the lowest earner even though it would never be earnings-ranked in', () => {
    const members = makeMembers(6);
    const lowestEarner = members[0];
    // budget 2 -> earnersBudget 1 (only the single top earner), diverseBudget 1. windowStart at
    // generation 0 is index 0 — exactly the lowest earner's own position.
    const eligible = selectPhase3Eligible(members, frozen, context, 2, 0);
    expect(eligible.has(lowestEarner)).toBe(true);
  });

  test('the stratified half eventually covers every member across generations, regardless of earnings rank', () => {
    const members = makeMembers(6);
    // budget 1 -> earnersBudget 1, diverseBudget 0 — isolates the earnings-ranked half entirely; the
    // 4 lowest earners (indices 0-3) should never appear under any generation.
    const earningsOnlyCovered = new Set<BeamSearchState>();
    for (let generation = 0; generation < members.length; generation++) {
      for (const m of selectPhase3Eligible(members, frozen, context, 1, generation)) earningsOnlyCovered.add(m);
    }
    expect(earningsOnlyCovered.size).toBe(1);
    expect(earningsOnlyCovered.has(members[5])).toBe(true);

    // budget 2 -> earnersBudget 1, diverseBudget 1 — the diverse half alone should cycle through
    // every member within `members.length` generations, so the union across that many generations
    // covers everyone, including members the earnings-ranked half never touches on its own.
    const covered = new Set<BeamSearchState>();
    for (let generation = 0; generation < members.length; generation++) {
      for (const m of selectPhase3Eligible(members, frozen, context, 2, generation)) covered.add(m);
    }
    expect(covered.size).toBe(members.length);
    for (const m of members) expect(covered.has(m)).toBe(true);
  });

  test('the stratified window advances by diverseBudget each generation, not by 1', () => {
    const members = makeMembers(8);
    // budget 4 -> earnersBudget 2, diverseBudget 2. Generation 0's diverse slice should be indices
    // [0, 1]; generation 1's should be [2, 3], not [1, 2] — confirms the window advances by the
    // diverse budget itself, not a fixed step of 1, so a wider budget covers the whole beam faster.
    const gen0 = selectPhase3Eligible(members, frozen, context, 4, 0);
    const gen1 = selectPhase3Eligible(members, frozen, context, 4, 1);
    expect(gen0.has(members[0])).toBe(true);
    expect(gen0.has(members[1])).toBe(true);
    expect(gen1.has(members[2])).toBe(true);
    expect(gen1.has(members[3])).toBe(true);
  });
});

/**
 * selectBeamSurvivors' earnings-guaranteed / elr-filled trim — see ../HANDOFF.md's "Algorithm
 * improvements" §7 for the real trace evidence this was built to address (the eventual winning branch
 * sat at earnings-rank 900-999 of 1000, then 4200-4900 of 5000 at a wider beam — the same relative
 * position at two different widths, confirming a pure earnings trim was permanently discarding real
 * branches, not just under-sampling them). Takes plain `RankedState[]` directly rather than real
 * engine states, so — unlike `selectPhase3Eligible`'s tests, which needed a real fixture and a
 * throwaway sweep script to get a controllable earnings ordering — earnings/elr here are just made up
 * per test case; `state` only needs to be *an* identity plus a `lastStepTime` for tie-breaking, not a
 * real simulated one.
 */
describe('selectBeamSurvivors', () => {
  const { initial: baseState } = splitEngineState(makeTestEngineState());

  /** A minimal RankedState — `lastStepTime` doubles as a stable per-item identity for the tie-break
   *  assertions, and as a way to tell two returned entries apart by more than their earnings/elr. */
  function ranked(lastStepTime: number, earnings: number, elr: number): RankedState {
    return { state: { ...baseState, lastStepTime }, earnings, elr };
  }

  /** selectBeamSurvivors expects its input already earnings-sorted (what `rankByEarnings` itself
   *  returns) — matches its real call site in runSearchLoop rather than re-deriving that ordering
   *  independently. */
  function earningsSorted(items: RankedState[]): RankedState[] {
    return [...items].sort((a, b) => b.earnings - a.earnings || a.state.lastStepTime - b.state.lastStepTime);
  }

  test('returns the input unchanged when it is already at or under beamWidth', () => {
    const input = earningsSorted([ranked(1, 100, 5), ranked(2, 90, 50)]);
    expect(selectBeamSurvivors(input, 5)).toEqual(input);
    expect(selectBeamSurvivors(input, 2)).toEqual(input);
  });

  test('the top earner survives via the earnings slice', () => {
    const input = earningsSorted([ranked(1, 1000, 1), ranked(2, 10, 2), ranked(3, 9, 3), ranked(4, 8, 4)]);
    const survivors = selectBeamSurvivors(input, 2);
    expect(survivors.some(r => r.earnings === 1000)).toBe(true);
  });

  test('a low-earnings, high-elr member survives via the elr fill, even though earnings alone would cut it', () => {
    const input = earningsSorted([ranked(1, 1000, 1), ranked(2, 900, 1), ranked(3, 800, 1), ranked(4, 1, 999)]);
    // budget 2 -> earningsBudget 1 (only the #1 earner by rank); the #4 item (worst earner in the
    // whole pool) would never survive a bare earnings trim at this width, but has by far the best elr.
    const survivors = selectBeamSurvivors(input, 2);
    expect(survivors.some(r => r.elr === 999)).toBe(true);
  });

  test('the elr fill reaches past a fixed nominal half when it overlaps the earnings slice, instead of shrinking', () => {
    // 6 items; the single best earner is ALSO the single best by elr, so the two slices overlap by
    // one. A naive fixed-size union (earningsBudget + elrBudget, capped independently) would return
    // only 5 of the requested 6 survivors here; selectBeamSurvivors must still return exactly 6 by
    // reaching one entry deeper into the elr ranking instead.
    const input = earningsSorted([
      ranked(1, 100, 100), // best by both earnings and elr
      ranked(2, 90, 10),
      ranked(3, 80, 20),
      ranked(4, 70, 30),
      ranked(5, 60, 90), // 2nd-best by elr
      ranked(6, 50, 5),
    ]);
    const survivors = selectBeamSurvivors(input, 6 - 1); // beamWidth 5, still more than either slice alone
    expect(survivors.length).toBe(5);
    // The 2nd-best-by-elr item must be the one pulled in beyond the earnings/elr overlap.
    expect(survivors.some(r => r.elr === 90)).toBe(true);
  });

  test('output stays in earnings-descending order', () => {
    const input = earningsSorted([ranked(1, 5, 500), ranked(2, 50, 5), ranked(3, 500, 50), ranked(4, 1, 1)]);
    const survivors = selectBeamSurvivors(input, 3);
    const earningsSeq = survivors.map(r => r.earnings);
    expect(earningsSeq).toEqual([...earningsSeq].sort((a, b) => b - a));
  });

  test('never returns more than the available pool, even if beamWidth exceeds it', () => {
    const input = earningsSorted([ranked(1, 10, 10), ranked(2, 5, 5)]);
    expect(selectBeamSurvivors(input, 100)).toEqual(input);
  });

  test('a wider beamWidth only ever adds survivors, never removes one (monotonicity)', () => {
    // Deterministic, deliberately uncorrelated earnings/elr pairs (not random — keeps this test
    // reproducible) generated via two different linear-congruential-ish steps over indices 0-19, so
    // neither axis is a simple function of the other.
    const input = earningsSorted(
      Array.from({ length: 20 }, (_, i) => ranked(i, (i * 37 + 11) % 97, (i * 53 + 7) % 89))
    );
    const narrow = new Set(selectBeamSurvivors(input, 5));
    const wide = new Set(selectBeamSurvivors(input, 12));
    for (const r of narrow) expect(wide.has(r)).toBe(true);
  });
});
