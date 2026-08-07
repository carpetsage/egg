/**
 * Exact small-case validation, per ../../03-performance-and-optimization.md's "Exact Small-Case
 * Validation" section: for a small enough scenario, exhaustive search should be used as ground
 * truth to check that the beam's own width/throttle limits don't lose the true optimum.
 *
 * The oracle here is deliberately NOT an independent reimplementation of the underlying game
 * economics (unlike, say, artifact-explorer's brute-force oracle, which needs one because there's
 * no simpler authoritative source to lean on) — this engine already delegates all game math to
 * existing, trusted functions (see ../../06-egg-codebase-integration.md), so duplicating that math
 * here would violate the design docs' own "never duplicate game logic" principle for no benefit.
 * What this oracle validates instead is narrower and just as real: given the EXACT SAME candidate
 * generation and macro primitives runBeamSearch itself uses (getLightweightPhaseCandidates,
 * selectCandidates, runTierMacro, runPhase3Macro — all imported directly, not reimplemented), does
 * an UNLIMITED exhaustive walk (no beam width cap, no per-generation macro throttle) ever find a
 * better score than the beam does? For a small enough scenario, it shouldn't — and this test
 * asserts exactly that.
 */
import { describe, expect, test } from 'vitest';
import { calculateArtifactModifiers } from '@/lib/artifacts';
import { getLightweightPhaseCandidates } from '../candidates';
import { runBeamSearch } from '../index';
import {
  nextLockedTier,
  runPhase3Macro,
  runTierMacro,
  type Phase3ArtifactFamilyCache,
  type Phase3ScoreCache,
} from '../macros';
import { applyResearchPurchase, phaseTransitionChild, selectCandidates } from '../search';
import { makeAutoProgressedTestState, makeTestContext } from '../testFixtures';
import { absoluteSimTimeOf, splitEngineState, type BeamFrozenContext, type BeamSearchState } from '../types';
import type { ResearchCostModifiers } from '@/calculations/commonResearch';
import type { SimulationContext } from '@/engine/types';

interface OracleCounters {
  nodesVisited: number;
}

/**
 * Exhaustively walks every reachable state up to `maxDepth`, trying Phase 3 from every phase-2 node
 * reached (not just a throttled top-K) and returns the best score found. Deliberately unbounded in
 * width — the whole point is to not share the beam's own width/throttle approximations.
 */
function exhaustiveBestScore(
  state: BeamSearchState,
  frozen: BeamFrozenContext,
  context: SimulationContext,
  mods: ResearchCostModifiers,
  deadline: number,
  maxDepth: number,
  depth: number,
  counters: OracleCounters,
  scoreCache: Phase3ScoreCache,
  artifactFamilyCache: Phase3ArtifactFamilyCache
): number {
  counters.nodesVisited++;
  let best = 0;

  if (state.phase === 2) {
    const result = runPhase3Macro(state, frozen, context, mods, deadline, scoreCache, artifactFamilyCache);
    if (result) best = Math.max(best, result.edge.finalScore);
  }

  if (depth < maxDepth) {
    const absoluteSimTime = absoluteSimTimeOf(state, context);
    if (absoluteSimTime < deadline) {
      const candidates = selectCandidates(getLightweightPhaseCandidates(state, frozen, context, mods, state.phase));
      for (const candidate of candidates) {
        if (absoluteSimTime + candidate.waitSeconds > deadline) continue;
        const child = applyResearchPurchase(state, frozen, context, candidate);
        best = Math.max(
          best,
          exhaustiveBestScore(
            child,
            frozen,
            context,
            mods,
            deadline,
            maxDepth,
            depth + 1,
            counters,
            scoreCache,
            artifactFamilyCache
          )
        );
      }

      if (nextLockedTier(state) !== null) {
        const tierResult = runTierMacro(state, frozen, context, deadline);
        if (tierResult) {
          best = Math.max(
            best,
            exhaustiveBestScore(
              tierResult.nextState,
              frozen,
              context,
              mods,
              deadline,
              maxDepth,
              depth + 1,
              counters,
              scoreCache,
              artifactFamilyCache
            )
          );
        }
      }
    }

    if (state.phase === 1) {
      const child = phaseTransitionChild(state);
      best = Math.max(
        best,
        exhaustiveBestScore(
          child,
          frozen,
          context,
          mods,
          deadline,
          maxDepth,
          depth + 1,
          counters,
          scoreCache,
          artifactFamilyCache
        )
      );
    }
  }

  return best;
}

describe('beam search oracle: exact small-case validation', () => {
  // A tiny, short-deadline scenario shared by both tests below — see the deadline's own comment for
  // why. Beam-width sweeps over it stay fast (seconds, not the ~30s/run a realistic deadline needs).
  function tinyScenario() {
    const context = makeTestContext();
    const startState = makeAutoProgressedTestState(context);
    const startAbsoluteSimTime = context.ascensionStartTime + (startState.lastStepTime - context.planStartOffset);
    // Deliberately short (well under the shortest realistic deadline, 1 sale out) to keep the
    // exhaustive walk's branching factor tractable — this is exactly the "small artificial
    // scenario" Part 3 asks for, not a realistic run.
    const deadline = startAbsoluteSimTime + 6 * 3600;
    return { context, startState, deadline };
  }

  test('the beam never finds a worse score than unlimited exhaustive search, on a small scenario', () => {
    const { context, startState, deadline } = tinyScenario();
    const maxDepth = 4;

    const { frozen, initial } = splitEngineState(startState);
    const mods: ResearchCostModifiers = {
      labUpgradeLevel: context.epicResearchLevels['cheaper_research'] || 0,
      researchCostMultiplier: context.colleggtibleModifiers.researchCost || 1,
      puzzleCubeMultiplier: calculateArtifactModifiers(frozen.artifactLoadout).researchCost.totalMultiplier,
    };

    const counters: OracleCounters = { nodesVisited: 0 };
    const oracleBest = exhaustiveBestScore(initial, frozen, context, mods, deadline, maxDepth, 0, counters, new Map(), {
      families: null,
    });

    // A generous beam width relative to this tiny scenario's branching factor — should
    // comfortably retain every branch the exhaustive walk explores.
    const beamResult = runBeamSearch(startState, context, { beamWidth: 500, deadline, maxDepth });

    console.log(
      `oracle: nodesVisited=${counters.nodesVisited}, oracleBest=${oracleBest}, beamScore=${beamResult.score}`
    );

    expect(oracleBest).toBeGreaterThan(0);
    // Both sides run the exact same deterministic computation for a matching final research
    // configuration, so this should be bit-for-bit exact, not just approximately close.
    expect(beamResult.score).toBe(oracleBest);
  }, 60_000);

  test('score is monotonically non-decreasing as beam width grows, on the same small scenario', () => {
    const { context, startState, deadline } = tinyScenario();
    const scores = [10, 50, 250].map(beamWidth => runBeamSearch(startState, context, { beamWidth, deadline }).score);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  }, 60_000);
});
