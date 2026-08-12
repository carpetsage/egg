import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// The arena is opt-in, via `ARENA`. `pnpm arena` sets it; `pnpm test` does not.
//
// Excluded here rather than skipped inside the spec, because a skip still pays
// for the file's imports: the roster awaits the 3.4MB HiGHS wasm at module
// scope and the instance generator pulls in the 82MB loot dataset, which is 90
// seconds before a single `describe` callback runs. Dropping the file from the
// selection is what actually keeps it out of the default suite.
//
// `invariants.spec.ts` carries a matching `describe.skipIf`, so invoking it
// directly under some other config reports a skip rather than a 12-minute run.
const ARENA_REQUESTED = process.env.ARENA !== undefined;

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Only the sweep itself. The rest of `src/oracle/` is either a plain unit
    // test (`evaluate-budget`, `pack-feasibility`, `independence`) or gates
    // itself on its own env var (`repro`, the oracle's deep fuzz), and excluding
    // the whole directory silently retires all of that — including the specs
    // `arena:check`, `repro` and `test:oracle` name directly, which then select
    // no files at all and exit non-zero.
    exclude: [...configDefaults.exclude, ...(ARENA_REQUESTED ? [] : ['src/oracle/arena/invariants.spec.ts'])],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    },
  },
});
