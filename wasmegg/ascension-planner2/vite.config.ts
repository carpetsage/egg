import path from 'path';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ascension-planner2/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ui: path.resolve(__dirname, '../../ui'),
    },
  },
  plugins: [vue(), vueJsx()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
  },
});
