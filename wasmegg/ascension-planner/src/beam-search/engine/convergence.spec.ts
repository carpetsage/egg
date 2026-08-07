/**
 * Convergence/timing benchmark — NOT a correctness test. Runs runBeamSearch at increasing beam
 * widths against a realistic-scale scenario (Part 3's "1-3 week purchase window") and reports
 * score + runtime for each, per ../03-performance-and-optimization.md's "Example Convergence Test"
 * and "Beam Width" sections. Gated behind RUN_CONVERGENCE=1 (pnpm test:convergence) since it's
 * deliberately slow and not something the default `pnpm test` run should pay for every time.
 *
 * Deadlines are the 1st/2nd/3rd Saturday-9am-Pacific research-sale-end after the start state's own
 * time — per the user's own correction, those are the only realistic deadlines a real player would
 * actually pick (this is literally getBuildPhaseEndForSaleCount, lib/events.ts, the same "build
 * phase end" boundary auto/shifts/c3.ts already uses) — NOT an arbitrary day count. An
 * unaligned deadline can land mid-week, away from any sale boundary, which is not a scenario this
 * feature is meant to be used for.
 */
import { describe, test } from 'vitest';
import { getBuildPhaseEndForSaleCount } from '@/lib/events';
import { runBeamSearch } from './index';
import { makeAutoProgressedTestState, makeTestContext } from './testFixtures';

const RUN = process.env.RUN_CONVERGENCE === '1';
const BEAM_WIDTHS = (process.env.CONVERGENCE_BEAM_WIDTHS ?? '250,500,1000').split(',').map(s => parseInt(s.trim(), 10));
const SALE_COUNTS = (process.env.CONVERGENCE_SALE_COUNTS ?? '1,2,3').split(',').map(s => parseInt(s.trim(), 10));

describe.skipIf(!RUN)('beam search convergence benchmark', () => {
  test(
    'score and runtime across sale-count deadlines and beam widths',
    () => {
      const context = makeTestContext();
      // Realistic starting point: the real auto-pipeline's own state right before C3 (habs,
      // vehicles, and early research already built up) — see makeAutoProgressedTestState's doc
      // comment for why this is more representative than a bare/zero-research state.
      const startState = makeAutoProgressedTestState(context);
      // absoluteSimTime = ascensionStartTime + (lastStepTime - planStartOffset), matching
      // absoluteSimTimeOf (./types.ts) and every other purchase-timing function in this codebase.
      const startAbsoluteSimTime = context.ascensionStartTime + (startState.lastStepTime - context.planStartOffset);

      console.log(
        `\nConvergence benchmark: startState.lastStepTime=${startState.lastStepTime}s (${(startState.lastStepTime / 86400).toFixed(1)}d into the ascension), ` +
          `researchTypesBought=${Object.keys(startState.researchLevels).length}, ` +
          `saleCounts=[${SALE_COUNTS.join(', ')}], widths=[${BEAM_WIDTHS.join(', ')}]\n`
      );

      for (const saleCount of SALE_COUNTS) {
        const deadline = getBuildPhaseEndForSaleCount(startAbsoluteSimTime, saleCount);
        const daysOut = (deadline - startAbsoluteSimTime) / 86400;
        console.log(
          `\n=== saleCount=${saleCount} (deadline ${daysOut.toFixed(2)}d out, ${new Date(deadline * 1000).toISOString()}) ===`
        );

        for (const beamWidth of BEAM_WIDTHS) {
          const t0 = performance.now();
          const result = runBeamSearch(startState, context, {
            beamWidth,
            deadline,
            maxDepth: 400,
            onProgress: p =>
              console.log(
                `  [gen ${p.depth}] beamSize=${p.beamSize} statesExpanded=${p.statesExpanded} ` +
                  `duplicatesRemoved=${p.duplicatesRemoved} tierMacroCalls=${p.tierMacroCalls} ` +
                  `phase3MacroCalls=${p.phase3MacroCalls} phase3CacheHits=${p.phase3CacheHits} ` +
                  `bestScoreSoFar=${p.bestScoreSoFar.toFixed(2)} elapsedMs=${p.elapsedMs}`
              ),
          });
          const elapsedMs = performance.now() - t0;

          console.log(
            `saleCount=${saleCount} beamWidth=${beamWidth}: score=${result.score.toFixed(4)} runtime=${(elapsedMs / 1000).toFixed(2)}s ` +
              `purchases=${result.researchIds.length} statesExpanded=${result.metrics.statesExpanded} ` +
              `duplicatesRemoved=${result.metrics.duplicatesRemoved} tierMacroCalls=${result.metrics.tierMacroCalls} ` +
              `phase3MacroCalls=${result.metrics.phase3MacroCalls}`
          );
        }
      }
    },
    30 * 60_000
  );
});
