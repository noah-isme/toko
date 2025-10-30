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

    const metadata = await generateMetadata({ params: { slug: 'awesome-product' } });
    expect(metadata.alternates?.canonical).toBe(getCanonical('/products/awesome-product'));
  });
});
