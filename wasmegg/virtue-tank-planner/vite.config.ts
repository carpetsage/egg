import path from 'path';

import { splitVendorChunkPlugin, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/artifact-explorer/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ui: path.resolve(__dirname, '../../ui'),
    },
  },
  plugins: [vue(), vueJsx(), splitVendorChunkPlugin()],
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.endsWith('loot.json')) {
            return 'loot';
          }
        }
      }
    }
  },
  server: {
    host: true,
  },
});
