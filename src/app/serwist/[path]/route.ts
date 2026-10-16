import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createSerwistRoute } from '@serwist/turbopack';

// Revision for the precached /offline page: the commit being built, or a
// fresh id when git is unavailable (for example in a tarball deploy).
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  randomUUID();

// Serves the bundled worker at /serwist/sw.js (ADR-009). The handler sends
// `Service-Worker-Allowed: /` so the worker can control the whole origin.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
    // MSW's worker is a development tool and must never be precached.
    globIgnores: ['**/node_modules/**/*', 'public/mockServiceWorker.js'],
    additionalPrecacheEntries: [{ url: '/offline', revision }],
  },
);
