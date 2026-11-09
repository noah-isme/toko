// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_MOCKING',
  'NEXT_PUBLIC_TENANT_ID',
] as const;
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

async function load() {
  vi.resetModules();
  return import('@/lib/api/server');
}

afterEach(() => {
  setEnv(original);
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('serverApiGet in mock mode', () => {
  beforeEach(() => setEnv({ NEXT_PUBLIC_API_URL: 'mock', NEXT_PUBLIC_API_MOCKING: 'false' }));

  it('answers from the in-process mock without HTTP', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { serverApiGet } = await load();

    const body = await serverApiGet<{ data: { title: string }[]; pagination: { perPage: number } }>(
      '/products?limit=3',
      { searchParams: { sort: 'name:asc' } },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body.data).toHaveLength(3);
    expect(body.pagination.perPage).toBe(3);
    const titles = body.data.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('returns seed product detail and throws ApiClientError(404) for unknown slugs', async () => {
    const { serverApiGet } = await load();
    const { ApiClientError } = await import('@/lib/api/apiClient');

    const found = await serverApiGet<{ data: { slug: string } }>('products/macbook-pro-14-m3');
    expect(found.data.slug).toBe('macbook-pro-14-m3');

    const missing = serverApiGet('products/does-not-exist');
    await expect(missing).rejects.toBeInstanceOf(ApiClientError);
    await expect(missing).rejects.toMatchObject({ status: 404 });
    await expect(serverApiGet('nope/nothing')).rejects.toMatchObject({ status: 404 });
  });

  it('uses the fixed ssr session and returns copies of the seed data', async () => {
    const { serverApiGet, SSR_MOCK_SESSION } = await load();
    expect(SSR_MOCK_SESSION).toBe('ssr');
    const a = await serverApiGet('/categories');
    const b = await serverApiGet('/categories');
    expect(a).toEqual(b);
    // Returned data is a copy: mutating it never touches the shared fixtures.
    (a as { data: unknown[] }).data.length = 0;
    expect((await serverApiGet<{ data: unknown[] }>('/categories')).data.length).toBeGreaterThan(0);
  });
});

describe('serverApiGet against a real API', () => {
  beforeEach(() =>
    setEnv({
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1/',
      NEXT_PUBLIC_API_MOCKING: 'false',
      NEXT_PUBLIC_TENANT_ID: 'tenant-1',
    }),
  );

  it('fetches an absolute URL with tenant header and no-store', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ data: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    const { serverApiGet } = await load();

    await expect(
      serverApiGet('/products', { searchParams: { q: 'tv', page: 2 } }),
    ).resolves.toEqual({ data: [] });

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/products?q=tv&page=2');
    expect(init.cache).toBe('no-store');
    expect(new Headers(init.headers).get('X-Tenant-ID')).toBe('tenant-1');
  });

  it('uses next.revalidate when given seconds', async () => {
    const fetchSpy = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', fetchSpy);
    const { serverApiGet } = await load();

    await serverApiGet('categories', { revalidate: 300 });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit & { next?: object }];
    expect(init.next).toEqual({ revalidate: 300 });
    expect(init.cache).toBeUndefined();
  });

  it('throws ApiClientError with the response status and error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: { message: 'gone', code: 'NOT_FOUND' } }, { status: 404 }),
      ),
    );
    const { serverApiGet } = await load();
    await expect(serverApiGet('/products/x')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'gone',
    });
  });

  it('passes an AbortSignal in both cache branches', async () => {
    const fetchSpy = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', fetchSpy);
    const { serverApiGet } = await load();

    await serverApiGet('categories');
    await serverApiGet('categories', { revalidate: 300 });
    const calls = fetchSpy.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][1].cache).toBe('no-store');
    expect(calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(calls[1][1].cache).toBeUndefined();
    expect(calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('maps a fetch TimeoutError to ApiClientError(504, TIMEOUT)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const error = new Error('The operation was aborted due to timeout');
        error.name = 'TimeoutError';
        throw error;
      }),
    );
    const { serverApiGet } = await load();
    const { ApiClientError } = await import('@/lib/api/apiClient');

    const pending = serverApiGet('/products');
    await expect(pending).rejects.toBeInstanceOf(ApiClientError);
    await expect(pending).rejects.toMatchObject({ status: 504, code: 'TIMEOUT' });
  });

  it('maps an AbortError while reading the body to ApiClientError(504)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new DOMException('This operation was aborted', 'AbortError');
        },
      })),
    );
    const { serverApiGet } = await load();
    const { ApiClientError } = await import('@/lib/api/apiClient');

    const pending = serverApiGet('/products');
    await expect(pending).rejects.toBeInstanceOf(ApiClientError);
    await expect(pending).rejects.toMatchObject({ status: 504, code: 'TIMEOUT' });
  });

  it('rethrows other fetch failures unchanged', async () => {
    const failure = new TypeError('fetch failed');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw failure;
      }),
    );
    const { serverApiGet } = await load();
    await expect(serverApiGet('/products')).rejects.toBe(failure);
  });
});
