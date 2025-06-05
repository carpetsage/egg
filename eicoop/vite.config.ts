import path from 'path';
import process from 'process';
import { ConfigEnv, UserConfigExport } from 'vite';
// @ts-expect-error - @tailwindcss/vite package has incorrect type definitions
import tailwindcss from '@tailwindcss/vite';
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
    tailwindcss({
      content: ['./index.html', './src/**/*.{vue,ts}', '../ui/**/*.vue'],
    }),
    viteMockServe({
      mockPath: 'mock',
      localEnabled: command === 'serve' && !!process.env.VITE_APP_MOCK,
    }),
  ],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          switch (true) {
            case /node_modules/.test(id):
              return 'vendor';
            case /.json$/.test(id):
              return 'json';
            case /contractlist/i.test(id):
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
