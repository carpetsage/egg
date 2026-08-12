import { describe, it, expect } from 'vitest';
import { perfectShipsConfig } from 'lib';
import { buildRecipeDag, computeBaseYield } from '.';
import { enumerateLaunchOptions } from './phases';
import { optimizeFull } from './optimizer-core';

// Latency guard, local-only: CI never runs the tests. Two different jobs, so
// two very different numbers.
//
// Recalibrated for the MILP planner, which is roughly 10x the beam search it
// replaced: best-of-3 on this reference machine is 1085ms for one target over
// 240 options and 1201ms for two over 279, against the search's 108ms and
// 237ms. That is the trade the branch made deliberately — see
// `DEFAULT_TUNING` in `solvers/highs/oa.ts` for what the extra second buys and
// what it does not. Most of it is branch-and-bound, not the wasm boundary, so it
// does not come back with a faster interface.
//
// STRICT is the real latency bar and is only meaningful on an idle machine,
// which is why it is gated behind RUN_PERF=1.
//
// LOOSE runs inside the full suite, sharing the box with whatever else is going
// on. Any cap tight enough to catch a 2x regression would flake on a busy
// laptop, so this one deliberately does not try — it is sized to catch
// *catastrophic* regressions only, of the kind a node budget typo would
// produce. If you want to know whether a change cost 100ms, run RUN_PERF=1;
// this number cannot tell you and is not trying to.
//
// Only three samples, not nine: at a second apiece the old sample count made
// this the slowest file in the suite by an order of magnitude.
const STRICT = process.env.RUN_PERF === '1';
const LOOSE_CAP_MS = 8000;
const STRICT_CAP_MS = 2000;

// tachyon-deflector-4 has the most launch options of any craftable target
// under perfectShipsConfig (~240), so it is the heaviest realistic instance.
const TARGET = 'tachyon-deflector-4';
const HORIZON_SECONDS = 30 * 24 * 3600;

describe('optimizer performance', () => {
  it(`solves a production-scale instance under ${STRICT ? STRICT_CAP_MS : LOOSE_CAP_MS}ms`, async () => {
    const dag = buildRecipeDag([TARGET], 30);
    const baseYield = computeBaseYield(null, [TARGET], dag);
    const options = enumerateLaunchOptions(perfectShipsConfig, dag);
    expect(options.length).toBeGreaterThan(0);

    const run = () =>
      optimizeFull({
        options,
        recipeDag: dag,
        desiredArtifactNodeIds: [TARGET],
        fuelCapacity: 1e18,
        timeCapacity: HORIZON_SECONDS,
        baseYield,
      });

    await run(); // warm up the JIT / load the wasm

    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await run();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const best = samples[0];
    const median = samples[Math.floor(samples.length / 2)];
    console.log(`[perf] ${options.length} options, best ${best.toFixed(1)}ms, median ${median.toFixed(1)}ms`);

    // Asserting on the fastest sample, not the median: contention only ever
    // adds time, so the minimum is the stable estimate a tight cap needs.
    expect(best).toBeLessThan(LOOSE_CAP_MS);
    if (STRICT) {
      expect(best).toBeLessThan(STRICT_CAP_MS);
    }
  }, 120_000);
});

// n=2 guard. A second target adds a score column, an epigraph column and a
// block of tangent rows to the MILP, which costs far less than it did in the
// search the MILP replaced: 1201ms against 1085ms, not double.
const JOINT_LOOSE_CAP_MS = 10_000;
const JOINT_STRICT_CAP_MS = 2500;
const SECOND_TARGET = 'puzzle-cube-4';

describe('optimizer performance (n=2)', () => {
  it(`solves a production-scale 2-target instance under ${STRICT ? JOINT_STRICT_CAP_MS : JOINT_LOOSE_CAP_MS}ms`, async () => {
    const targets = [TARGET, SECOND_TARGET];
    const dag = buildRecipeDag(targets, 30);
    const baseYield = computeBaseYield(null, targets, dag);
    const options = enumerateLaunchOptions(perfectShipsConfig, dag);
    expect(options.length).toBeGreaterThan(0);

    const run = () =>
      optimizeFull({
        options,
        recipeDag: dag,
        desiredArtifactNodeIds: targets,
        fuelCapacity: 1e18,
        timeCapacity: HORIZON_SECONDS,
        baseYield,
      });

    await run(); // warm up the JIT / load the wasm

    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await run();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const best = samples[0];
    const median = samples[Math.floor(samples.length / 2)];
    console.log(`[perf-joint] ${options.length} options, best ${best.toFixed(1)}ms, median ${median.toFixed(1)}ms`);

    expect(best).toBeLessThan(JOINT_LOOSE_CAP_MS);
    if (STRICT) {
      expect(best).toBeLessThan(JOINT_STRICT_CAP_MS);
    }
  }, 120_000);
});
