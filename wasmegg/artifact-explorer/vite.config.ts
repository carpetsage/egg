import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/artifact-explorer/',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vue(), vueJsx()],
  build: {
    chunkSizeWarningLimit: 25000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ test: /loot.json$/, name: 'loot' }],
        },
      },
    },
  },
  server: {
    host: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
});
