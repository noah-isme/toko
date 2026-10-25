import {
  ApiClientError,
  apiDownload,
  parseContentDispositionFilename,
  setAccessToken,
} from '../apiClient';

describe('parseContentDispositionFilename', () => {
  it.each([
    ['attachment; filename="INV-2026-000042.pdf"', 'INV-2026-000042.pdf'],
    ['attachment; filename=INV-2026-000042.pdf', 'INV-2026-000042.pdf'],
    ["attachment; filename*=UTF-8''Faktur%20%C3%A9.pdf", 'Faktur é.pdf'],
    ['attachment; filename="fallback.pdf"; filename*=UTF-8\'\'preferred.pdf', 'preferred.pdf'],
    ['attachment; filename="../../etc/passwd"', 'passwd'],
    ['attachment; filename="a\\"b.pdf"', 'a"b.pdf'],
  ])('reads %s', (header, expected) => {
    expect(parseContentDispositionFilename(header)).toBe(expected);
  });

  it.each([null, '', 'attachment', 'attachment; filename=""'])('returns null for %j', (header) => {
    expect(parseContentDispositionFilename(header)).toBeNull();
  });
});

describe('apiDownload', () => {
  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('returns the blob and filename and sends the bearer token', async () => {
    setAccessToken('token-123');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="INV-2026-000001.pdf"',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiDownload('/orders/o-1/invoice', { requiresAuth: true });

    expect(result.filename).toBe('INV-2026-000001.pdf');
    expect(result.blob.size).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/orders\/o-1\/invoice$/);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('surfaces the JSON error envelope as ApiClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'INVOICE_NOT_AVAILABLE', message: 'not paid' } }),
            { status: 409, headers: { 'content-type': 'application/json' } },
          ),
        ),
    );

    const request = apiDownload('/orders/o-1/invoice');
    await expect(request).rejects.toBeInstanceOf(ApiClientError);
    await expect(request).rejects.toMatchObject({ code: 'INVOICE_NOT_AVAILABLE', status: 409 });
  });
});
