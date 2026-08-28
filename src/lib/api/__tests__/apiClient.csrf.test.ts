import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  apiClient,
  getCsrfTokenFromCookie,
  setCsrfToken,
  ensureCsrfToken,
  setAccessToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ApiClientError,
  AuthError,
} from '../apiClient';

describe('apiClient CSRF double-submit cookie contract', () => {
  beforeEach(() => {
    setAccessToken(null);
    setCsrfToken(null);
    if (typeof document !== 'undefined') {
      document.cookie = '';
    }
  });

  afterEach(() => {
    setAccessToken(null);
    setCsrfToken(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads X-CSRF-Token directly from document.cookie', () => {
    expect(getCsrfTokenFromCookie()).toBeNull();
    document.cookie = `${CSRF_COOKIE_NAME}=test-token-value; Path=/`;
    expect(getCsrfTokenFromCookie()).toBe('test-token-value');

    setCsrfToken('updated-token-value');
    expect(getCsrfTokenFromCookie()).toBe('updated-token-value');

    setCsrfToken(null);
    expect(getCsrfTokenFromCookie()).toBeNull();
  });

  it('uses existing X-CSRF-Token cookie on mutating requests without bootstrap GET', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=existing-cookie-token; Path=/`;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient<{ data: { success: boolean } }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ qty: 1 }),
    });

    expect(result).toEqual({ data: { success: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0].toString();
    const calledInit = fetchMock.mock.calls[0][1];
    expect(calledUrl).toContain('/orders');
    const headers = new Headers(calledInit.headers);
    expect(headers.get(CSRF_HEADER_NAME)).toBe('existing-cookie-token');
    expect(calledInit.credentials).toBe('include');
  });

  it('bootstraps missing cookie via safe GET and then executes mutating request', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      calls.push(urlStr);

      if (urlStr.includes('/categories')) {
        // Backend sets cookie on safe GET
        document.cookie = `${CSRF_COOKIE_NAME}=bootstrapped-csrf-token; Path=/`;
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }

      if (urlStr.includes('/orders')) {
        const headers = new Headers(init?.headers);
        if (headers.get(CSRF_HEADER_NAME) === 'bootstrapped-csrf-token') {
          return Promise.resolve(
            new Response(JSON.stringify({ data: { orderId: 'ord-123' } }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(
          new Response('missing csrf token', {
            status: 403,
            headers: { 'content-type': 'text/plain' },
          }),
        );
      }

      return Promise.resolve(new Response('not found', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient<{ data: { orderId: string } }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ qty: 1 }),
    });

    expect(result).toEqual({ data: { orderId: 'ord-123' } });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('/categories');
    expect(calls[1]).toContain('/orders');
    expect(getCsrfTokenFromCookie()).toBe('bootstrapped-csrf-token');
  });

  it('fails with a clear client error if bootstrap GET fails to produce cookie', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/categories')) {
        // GET succeeds but no cookie is set in document.cookie
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(new Response('should not be called', { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiClient('/orders', {
        method: 'POST',
        body: JSON.stringify({ qty: 1 }),
      }),
    ).rejects.toThrowError(ApiClientError);

    // Assert that the mutating request /orders was not called
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toContain('/categories');
  });

  it('refreshes cookie and retries once on genuine 403 CSRF error', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=stale-token; Path=/`;

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
      callCount++;
      const urlStr = url.toString();

      // 1st call: POST /orders with stale token returns 403
      if (callCount === 1 && urlStr.includes('/orders')) {
        return Promise.resolve(
          new Response('invalid csrf token', {
            status: 403,
            headers: { 'content-type': 'text/plain' },
          }),
        );
      }

      // 2nd call: bootstrap GET /categories refreshes cookie
      if (urlStr.includes('/categories')) {
        document.cookie = `${CSRF_COOKIE_NAME}=fresh-token-456; Path=/`;
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }

      // 3rd call: retried POST /orders with fresh token succeeds
      if (urlStr.includes('/orders')) {
        const headers = new Headers(init?.headers);
        if (headers.get(CSRF_HEADER_NAME) === 'fresh-token-456') {
          return Promise.resolve(
            new Response(JSON.stringify({ data: { success: true } }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          );
        }
      }

      return Promise.resolve(new Response('error', { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient<{ data: { success: boolean } }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ qty: 1 }),
    });

    expect(result).toEqual({ data: { success: true } });
    expect(callCount).toBe(3);
    expect(getCsrfTokenFromCookie()).toBe('fresh-token-456');
  });

  it('does not retry infinitely if 403 CSRF error persists after refresh', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=bad-token; Path=/`;

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
      callCount++;
      const urlStr = url.toString();

      if (urlStr.includes('/orders')) {
        return Promise.resolve(
          new Response('missing csrf token', {
            status: 403,
            headers: { 'content-type': 'text/plain' },
          }),
        );
      }

      if (urlStr.includes('/categories')) {
        document.cookie = `${CSRF_COOKIE_NAME}=still-bad-token; Path=/`;
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }

      return Promise.resolve(new Response('error', { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiClient('/orders', {
        method: 'POST',
        body: JSON.stringify({ qty: 1 }),
      }),
    ).rejects.toBeInstanceOf(AuthError);

    // Exactly 3 calls: 1st POST, 1 bootstrap GET, 1 retry POST
    expect(callCount).toBe(3);
  });

  it('allows Bearer-authenticated mutating requests even when CSRF cookie is absent', async () => {
    setAccessToken('valid-bearer-token');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { updated: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient<{ data: { updated: boolean } }>('/users/me', {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify({ name: 'Jane' }),
    });

    expect(result).toEqual({ data: { updated: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0].toString();
    const calledInit = fetchMock.mock.calls[0][1];
    expect(calledUrl).toContain('/users/me');
    const headers = new Headers(calledInit.headers);
    expect(headers.get('Authorization')).toBe('Bearer valid-bearer-token');
    expect(headers.get(CSRF_HEADER_NAME)).toBeNull();
  });

  it('attaches X-CSRF-Token on Bearer-authenticated requests when cookie is present', async () => {
    setAccessToken('valid-bearer-token');
    document.cookie = `${CSRF_COOKIE_NAME}=active-csrf; Path=/`;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { updated: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiClient('/users/me', {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify({ name: 'Jane' }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledInit = fetchMock.mock.calls[0][1];
    const headers = new Headers(calledInit.headers);
    expect(headers.get('Authorization')).toBe('Bearer valid-bearer-token');
    expect(headers.get(CSRF_HEADER_NAME)).toBe('active-csrf');
  });

  it('deduplicates concurrent bootstrap GET requests into a single promise', async () => {
    let bootstrapCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = url.toString();

      if (urlStr.includes('/categories')) {
        bootstrapCount++;
        document.cookie = `${CSRF_COOKIE_NAME}=deduped-csrf-token; Path=/`;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ data: [] }), {
                  status: 200,
                  headers: { 'content-type': 'application/json' },
                }),
              ),
            10,
          ),
        );
      }

      if (urlStr.includes('/endpoint-')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { ok: true } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }

      return Promise.resolve(new Response('not found', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const [res1, res2, res3] = await Promise.all([
      apiClient('/endpoint-1', { method: 'POST', body: JSON.stringify({ a: 1 }) }),
      apiClient('/endpoint-2', { method: 'POST', body: JSON.stringify({ b: 2 }) }),
      apiClient('/endpoint-3', { method: 'POST', body: JSON.stringify({ c: 3 }) }),
    ]);

    expect(res1).toEqual({ data: { ok: true } });
    expect(res2).toEqual({ data: { ok: true } });
    expect(res3).toEqual({ data: { ok: true } });
    expect(bootstrapCount).toBe(1);
    // Total calls: 1 bootstrap GET + 3 POSTs = 4
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
