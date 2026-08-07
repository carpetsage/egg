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
});
