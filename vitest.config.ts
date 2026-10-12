import { fileURLToPath } from 'node:url';

import { coverageConfigDefaults, defineConfig } from 'vitest/config';

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
      include: ['src/**'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/lib/api/generated/**',
        'src/mocks/**',
        'src/app/api/v1/**',
        'src/app/serwist/**',
        'src/app/sw*.ts',
        '**/*.d.ts',
        'src/app/**/loading.tsx',
      ],
      // Ratchet: measured baseline minus 2, floored (2026-10-12: statements/lines 53.89,
      // branches 72.5, functions 62.59). Thresholds only move up; raise them in the PR that lifts
      // coverage by >= 2 points and never lower them without an ADR note (see README).
      thresholds: {
        statements: 51,
        branches: 70,
        functions: 60,
        lines: 51,
      },
    },
  },
});
