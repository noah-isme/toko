import type { MetadataRoute } from 'next';

import { isIndexableDeployment } from '@/shared/config/env';
import { abs, siteUrl } from '@/shared/seo/seo';

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      host: siteUrl,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: abs('/sitemap.xml'),
    host: siteUrl,
  };
}
