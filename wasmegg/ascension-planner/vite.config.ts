import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// There's no meaningful `version` field to report (package.json's is left at the 0.0.0 default),
// so use the git commit instead — the closest thing to a build identifier this app has. Falls back
// to 'unknown' for source builds without a .git directory (e.g. a downloaded tarball) rather than
// failing the build.
function gitInfo(): { commit: string; commitTime: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
    const commitTime = execSync('git log -1 --format=%cI', { cwd: __dirname }).toString().trim();
    return { commit, commitTime };
  } catch {
    return { commit: 'unknown', commitTime: 'unknown' };
  }
}

const { commit, commitTime } = gitInfo();

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ascension-planner/',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vue(), vueJsx()],
  define: {
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_COMMIT_TIME__: JSON.stringify(commitTime),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },

  server: {
    host: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
});
