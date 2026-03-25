import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/legendary-study/',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'esnext'
  },
  server: {
    host: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
});
