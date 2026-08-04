import { describe, it, expect } from 'vitest';
import { perfectShipsConfig } from 'lib';
import { buildRecipeDag, computeBaseYield } from '.';
import { enumerateLaunchOptions } from './phases';
import { optimizeFull } from './optimizer-core';

// Latency guard, local-only: CI never runs the tests. The tight bar is gated
// behind RUN_PERF=1; the loose cap catches gross regressions. Calibration on
// the reference machine: best-of-9 lands at 108-111ms. The 26-point tangent
// grid costs ~70% over the 22-point one it replaced (63ms), because every
// breakpoint is another row in every LP the search re-solves.
// Two different jobs, so two very different numbers.
//
// STRICT is the real latency bar and is only meaningful on an idle machine,
// which is why it is gated behind RUN_PERF=1.
//
// LOOSE runs inside the full suite, sharing the box with whatever else is
// going on. Measured on this reference machine: ~177ms idle, but 283ms and
// 481ms best-of-9 under four competing CPU hogs. Any cap tight enough to catch
// a 2x regression would flake on a busy laptop, so this one deliberately does
// not try — it is sized to catch *catastrophic* regressions only, of the kind
// the stage ablation produced when the scans ran unpruned (23s). If you want
// to know whether a change cost 20ms, run RUN_PERF=1; this number cannot tell
// you and is not trying to.
const STRICT = process.env.RUN_PERF === '1';
const LOOSE_CAP_MS = 2000;
const STRICT_CAP_MS = 200;

// tachyon-deflector-4 has the most launch options of any craftable target
// under perfectShipsConfig (~240), so it is the heaviest realistic instance.
const TARGET = 'tachyon-deflector-4';
const HORIZON_SECONDS = 30 * 24 * 3600;

describe('optimizer performance', () => {
  it(`solves a production-scale instance under ${STRICT ? STRICT_CAP_MS : LOOSE_CAP_MS}ms`, () => {
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

    run(); // warm up the JIT

    const samples: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t0 = performance.now();
      run();
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
  });
});

// n=2 guard. A second target adds an epigraph variable and a block of tangent
// rows to every LP the search re-solves, roughly doubling per-eval cost.
// Same calibration: best-of-9 lands at 237-241ms.
const JOINT_LOOSE_CAP_MS = 4000;
const JOINT_STRICT_CAP_MS = 400;
const SECOND_TARGET = 'puzzle-cube-4';

describe('optimizer performance (n=2)', () => {
  it(`solves a production-scale 2-target instance under ${STRICT ? JOINT_STRICT_CAP_MS : JOINT_LOOSE_CAP_MS}ms`, () => {
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

    run(); // warm up the JIT

    const samples: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t0 = performance.now();
      run();
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
  }, 60_000);
});
