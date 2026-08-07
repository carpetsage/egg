import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // The beam search engine's own tests run a real (if small) search, which is legitimately
    // slower than the 5s default — see src/beam-search/06-egg-codebase-integration.md §4/§8 for why
    // macro calls (tier unlock, Phase 3) dominate runtime.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
  },
});
