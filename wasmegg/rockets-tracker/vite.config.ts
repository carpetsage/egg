import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/rockets-tracker/',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vue(), ViteImageOptimizer()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
});
