import { describe, expect, it, vi, afterEach } from 'vitest';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('canonical metadata', () => {
  it('generates canonical URL for product detail', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_API_URL = 'mock';

    vi.resetModules();
    const [{ generateMetadata }, { getCanonical }] = await Promise.all([
      import('@/app/(storefront)/products/[slug]/page'),
      import('@/shared/seo/seo'),
    ]);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'macbook-pro-14-m3' }),
    });
    expect(metadata.alternates?.canonical).toBe(getCanonical('/products/macbook-pro-14-m3'));
  }, 10_000);
});

describe('localeAlternates', () => {
  it.each([
    ['/', 'https://example.com/', 'https://example.com/en'],
    ['/products', 'https://example.com/products', 'https://example.com/en/products'],
    ['/products/x', 'https://example.com/products/x', 'https://example.com/en/products/x'],
  ])('maps %s to id/en/x-default hreflang URLs', async (path, idUrl, enUrl) => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    vi.resetModules();
    const { localeAlternates } = await import('@/shared/seo/seo');

    expect(localeAlternates(path)).toEqual({ id: idUrl, en: enUrl, 'x-default': idUrl });
  });

  it('uses localeAlternates for product detail metadata', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_API_URL = 'mock';
    vi.resetModules();
    const { generateMetadata } = await import('@/app/(storefront)/products/[slug]/page');

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'macbook-pro-14-m3' }),
    });
    expect(metadata.alternates?.languages).toEqual({
      id: 'https://example.com/products/macbook-pro-14-m3',
      en: 'https://example.com/en/products/macbook-pro-14-m3',
      'x-default': 'https://example.com/products/macbook-pro-14-m3',
    });
  }, 10_000);
});
