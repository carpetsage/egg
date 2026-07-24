import { describe, it, expect } from 'vitest';
import { perfectShipsConfig } from 'lib';
import { buildRecipeDag, computeBaseYield } from '.';
import { enumerateLaunchOptions } from './phases';
import { optimizeFull } from './optimizer-core';

// Latency guard for the outer solver. The tight bar is gated behind RUN_PERF=1
// (shared runners are noisy); the loose cap catches gross regressions.
const STRICT = process.env.RUN_PERF === '1';
const LOOSE_CAP_MS = 300;
const STRICT_CAP_MS = 100;

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
    for (let i = 0; i < 7; i++) {
      const t0 = performance.now();
      run();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    const max = samples[samples.length - 1];
    console.log(`[perf] ${options.length} options, median ${median.toFixed(1)}ms, max ${max.toFixed(1)}ms`);

    expect(median).toBeLessThan(LOOSE_CAP_MS);
    if (STRICT) {
      expect(median).toBeLessThan(STRICT_CAP_MS);
    }
  });
});
