import { describe, expect, test } from 'vitest';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { runSearchLoop } from './search';
import { splitEngineState } from './types';
import { makeTestContext, makeTestEngineState } from './testFixtures';

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
