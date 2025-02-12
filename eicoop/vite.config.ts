import path from 'path';
import process from 'process';
import { splitVendorChunkPlugin, ConfigEnv, UserConfigExport } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteMockServe } from 'vite-plugin-mock';

// Run VITE_APP_MOCK=1 yarn dev to enable API mocking.

// https://vitejs.dev/config/
export default ({ command }: ConfigEnv): UserConfigExport => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ui: path.resolve(__dirname, '../ui'),
    },
  },
  plugins: [
    vue(),
    viteMockServe({
      mockPath: 'mock',
      localEnabled: command === 'serve' && !!process.env.VITE_APP_MOCK,
    }),
    splitVendorChunkPlugin(),
  ],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('contract')) {
            console.log(id);
            return 'contractlist';
          }
        },
      },
    },
  },
  server: {
    host: true,
  },
});
