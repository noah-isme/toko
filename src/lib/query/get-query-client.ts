import 'server-only';

import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * One QueryClient per server request (React `cache` is request-scoped), so
 * prefetches from a page and its `generateMetadata` share one cache and no
 * data leaks between requests. The client hooks use the same staleTime, so
 * hydrated queries are fresh on first paint and are not refetched.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000 },
      },
    }),
);
