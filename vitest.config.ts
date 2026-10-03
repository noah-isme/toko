import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Node 25+ enables the experimental Web Storage API by default; its global `localStorage`
// shadows jsdom's implementation and breaks tests that touch storage. The flag exists since
// Node 22, so disable it in the forked test workers there and on any newer major.
const nodeMajor = Number(process.versions.node.split('.')[0]);
const workerExecArgv = nodeMajor >= 22 ? ['--no-experimental-webstorage'] : [];

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: workerExecArgv,
      },
    },
    globals: true,
    hookTimeout: 10_000,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
