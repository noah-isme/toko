import { AbortError, apiClient, AuthError, NetworkError, setAccessToken } from '../apiClient';

describe('apiClient error typology', () => {
  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('normalizes browser abort exceptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Navigation cancelled', 'AbortError')),
    );

    await expect(apiClient('/products')).rejects.toBeInstanceOf(AbortError);
  });

  it('normalizes net::ERR_ABORTED failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('net::ERR_ABORTED')));

    await expect(apiClient('/products')).rejects.toBeInstanceOf(AbortError);
  });

  it('normalizes transient fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiClient('/products')).rejects.toBeInstanceOf(NetworkError);
  });

  it('preserves a transient refresh failure instead of converting it to an auth failure', async () => {
    setAccessToken('existing-token');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    );

    await expect(apiClient('/protected', { requiresAuth: true })).rejects.toBeInstanceOf(
      NetworkError,
    );
    expect(localStorage.getItem('accessToken')).toBe('existing-token');
  });

  it.each([401, 403] as const)('creates AuthError for HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'AUTH', message: 'Denied' } }), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const request = apiClient('/protected');
    await expect(request).rejects.toMatchObject({
      name: 'AuthError',
      status,
    });
    await expect(request).rejects.toBeInstanceOf(AuthError);
  });
});
