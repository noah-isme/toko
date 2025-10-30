import { describe, expect, it, vi, afterEach } from 'vitest';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('sitemap generator', () => {
  it('includes homepage and products listing with absolute URLs', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    process.env.NEXT_PUBLIC_API_URL = 'mock';

    vi.resetModules();
    const sitemap = (await import('@/app/sitemap')).default;
    const entries = await sitemap();

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://example.com' }),
        expect.objectContaining({ url: 'https://example.com/products' }),
      ]),
    );
    entries.forEach((entry) => {
      expect(entry.url.startsWith('https://example.com')).toBe(true);
    });
  });
});
