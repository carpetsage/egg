import process from 'process';
import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import vue from '@vitejs/plugin-vue';
import { viteMockServe } from 'vite-plugin-mock';

// Run VITE_APP_MOCK=1 yarn dev to enable API mocking.

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    vue(),
    viteMockServe({
      mockPath: 'mock',
      enable: command === 'serve' && !!process.env.VITE_APP_MOCK,
    }),
    ViteImageOptimizer(),
  ],
  build: {
    chunkSizeWarningLimit: 3000,
  },
  server: {
    host: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
}));
