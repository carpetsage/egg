import { describe, expect, test } from 'vitest';
import { getResearchById } from '@/calculations/commonResearch';
import { runBeamSearch } from './index';
import { makeTestContext, makeTestEngineState } from './testFixtures';

describe('runBeamSearch smoke test', () => {
  test('produces a plan that only buys real, tier-eligible research in a valid order', () => {
    const context = makeTestContext();
    const startState = makeTestEngineState();
    const deadline = context.ascensionStartTime + 6 * 3600; // 6 hours — small on purpose

    // This is a correctness smoke test, not a performance benchmark (see the dedicated convergence
    // spec for that) — maxDepth is capped low so it terminates quickly regardless of how many
    // generations a toy 6-hour/zero-research scenario could otherwise run for.
    const result = runBeamSearch(startState, context, { beamWidth: 5, deadline, maxDepth: 8 });

    expect(result.score).toBeGreaterThan(0);
    expect(result.metrics.statesExpanded).toBeGreaterThan(0);

    // Every purchased id must be a real research, and levels must be reached in order (never
    // skipping from level N to N+2 without an intervening N+1 entry for the same id).
    const seenLevel: Record<string, number> = {};
    for (const id of result.researchIds) {
      const research = getResearchById(id);
      expect(research, `unknown research id "${id}"`).toBeDefined();
      const prev = seenLevel[id] || 0;
      seenLevel[id] = prev + 1;
      expect(result.endLevels[id]).toBeGreaterThanOrEqual(seenLevel[id]);
    }

    // endLevels must never exceed a research's max level.
    for (const [id, level] of Object.entries(result.endLevels)) {
      const research = getResearchById(id);
      if (!research) continue;
      expect(level).toBeLessThanOrEqual(research.levels);
    }

    expect(result.lastPurchaseTime).toBeLessThanOrEqual(deadline);
  });

  test('throws a clear error when rawBackup is missing', () => {
    const context = makeTestContext({ rawBackup: undefined });
    const startState = makeTestEngineState();
    expect(() =>
      runBeamSearch(startState, context, { beamWidth: 10, deadline: context.ascensionStartTime + 86400 })
    ).toThrow(/rawBackup/);
  });

  test('result.trace is absent by default and populated end-to-end when options.trace is set', () => {
    const context = makeTestContext();
    const startState = makeTestEngineState();
    const deadline = context.ascensionStartTime + 6 * 3600;

    const plain = runBeamSearch(startState, context, { beamWidth: 5, deadline, maxDepth: 8 });
    expect(plain.trace).toBeUndefined();

    const traced = runBeamSearch(startState, context, { beamWidth: 5, deadline, maxDepth: 8, trace: true });
    expect(traced.trace).toBeDefined();
    // trace: true is purely additive — same plan either way (see search.spec.ts's equivalent check
    // at the runSearchLoop level for the metrics/finished-count side of this).
    expect(traced.researchIds).toEqual(plain.researchIds);
    expect(traced.score).toBe(plain.score);

    const trace = traced.trace!;
    expect(trace.steps.length).toBeGreaterThan(0);
    // Every step's depth is strictly increasing, matching the winning path's own generation order.
    for (let i = 1; i < trace.steps.length; i++) {
      expect(trace.steps[i].depth).toBeGreaterThan(trace.steps[i - 1].depth);
    }
    for (const step of trace.steps) {
      expect(step.chosenRank).toBeGreaterThanOrEqual(1);
      expect(step.chosenRank).toBeLessThanOrEqual(step.beamSizeThisGeneration);
      expect(step.alternatives.length).toBeLessThanOrEqual(step.beamSizeThisGeneration - 1);
    }
    expect(trace.finalStep.finalScore).toBe(traced.score);
    expect(trace.finalStep.winnerRank).toBeGreaterThanOrEqual(1);
    expect(trace.finalStep.winnerRank).toBeLessThanOrEqual(trace.finalStep.totalPhase3AttemptsFound);
  });
});
