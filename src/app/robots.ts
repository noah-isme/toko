import type { MetadataRoute } from 'next';

import { abs, siteUrl } from '@/shared/seo/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: abs('/sitemap.xml'),
    host: siteUrl,
  };
}
