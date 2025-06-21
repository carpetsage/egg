import path from 'path';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

import { splitVendorChunkPlugin, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/rockets-tracker/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ui: path.resolve(__dirname, '../../ui'),
    },
  },
  plugins: [vue(), splitVendorChunkPlugin(), ViteImageOptimizer()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
  },
});
