import 'server-only';

import { serverApiGet } from './server';
import { createCatalogApi } from './services/catalog';

/**
 * The browser `catalogApi` over the server transport. Server prefetches go
 * through the same functions (and mappers) as the client hooks, so hydrated
 * React Query data has exactly the shape the hooks would have fetched.
 */
export const serverCatalogApi = createCatalogApi((path) => serverApiGet(path));
