import 'server-only';

import { ApiClientError } from './apiClient';

import type { MockResult } from '@/mocks/route';
import { getPublicEnv } from '@/shared/config/env';

/** Session id used for in-process mock calls: seed data only, no cart/admin state. */
export const SSR_MOCK_SESSION = 'ssr';

export interface ServerApiGetOptions {
  searchParams?: URLSearchParams | Record<string, string | number | boolean | undefined>;
  /** Seconds for Next's data cache; `false`/omitted means `cache: 'no-store'`. */
  revalidate?: number | false;
}

function splitPath(path: string, extra?: ServerApiGetOptions['searchParams']) {
  const trimmed = path.replace(/^\/+/, '');
  const queryIndex = trimmed.indexOf('?');
  const pathname = queryIndex === -1 ? trimmed : trimmed.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : trimmed.slice(queryIndex + 1));

  if (extra instanceof URLSearchParams) {
    extra.forEach((value, key) => params.append(key, value));
  } else if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) params.append(key, String(value));
    }
  }
  return { pathname, params };
}

function unwrapMockResult<T>(result: MockResult | null, pathname: string): T {
  if (result === null) {
    throw new ApiClientError(`Not Found: ${pathname}`, 'NOT_FOUND', 404);
  }
  let body: MockResult = result;
  if (!Array.isArray(result) && typeof result.status === 'number') {
    const { status, ...rest } = result;
    if (status >= 400) {
      throw new ApiClientError(String(rest.message ?? 'Request failed'), 'MOCK_ERROR', status);
    }
    body = rest;
  }
  // Round-trip through JSON so callers get exactly what the HTTP route would
  // send (and can never mutate the shared fixtures).
  return JSON.parse(JSON.stringify(body)) as T;
}

/**
 * GET from the API inside Server Components, route handlers and metadata.
 *
 * - Real API: absolute `NEXT_PUBLIC_API_URL` + `X-Tenant-ID`, `cache: 'no-store'`
 *   unless `revalidate` is a number.
 * - Mock mode: calls the in-process mock (`src/mocks/route.ts`) with the
 *   `'ssr'` session, so no HTTP round-trip and no relative-URL problem.
 *
 * Never touches browser-only APIs. Throws `ApiClientError` on non-2xx.
 */
export async function serverApiGet<T>(path: string, options: ServerApiGetOptions = {}): Promise<T> {
  const { pathname, params } = splitPath(path, options.searchParams);

  // Literal guard (not a constant) so non-mock builds drop the mock chunk;
  // enforced by tests/config/mock-gate.test.ts.
  if (
    process.env.NEXT_PUBLIC_API_URL === 'mock' ||
    process.env.NEXT_PUBLIC_API_MOCKING === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING !== 'false')
  ) {
    const { handleMockRequest } = await import('@/mocks/route');
    const result = handleMockRequest(pathname, 'GET', null, SSR_MOCK_SESSION, params);
    return unwrapMockResult<T>(result, pathname);
  }

  const { apiUrl, tenantId } = getPublicEnv();
  const query = params.toString();
  const url = `${apiUrl.replace(/\/$/, '')}/${pathname}${query ? `?${query}` : ''}`;
  const headers = new Headers({ Accept: 'application/json' });
  if (tenantId) headers.set('X-Tenant-ID', tenantId);

  const response = await fetch(
    url,
    typeof options.revalidate === 'number'
      ? { headers, next: { revalidate: options.revalidate } }
      : { headers, cache: 'no-store' },
  );

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    let code = 'UNKNOWN';
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code ?? code;
    } catch {
      // Non-JSON error body: keep the status text.
    }
    throw new ApiClientError(message, code, response.status);
  }

  return (await response.json()) as T;
}
