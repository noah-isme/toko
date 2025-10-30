import { describe, expect, it, vi, afterEach } from 'vitest';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('robots directive', () => {
  it('returns sitemap and host referencing the site URL', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

    vi.resetModules();
    const robots = (await import('@/app/robots')).default;
    const config = robots();

    expect(config.host).toBe('https://example.com');
    expect(config.sitemap).toBe('https://example.com/sitemap.xml');
    expect(config.rules).toEqual(expect.objectContaining({ allow: '/' }));
  });
});
