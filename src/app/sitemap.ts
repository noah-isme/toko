import type { MetadataRoute } from 'next';

import { productListSchema } from '@/lib/api/schemas';
import { getPublicEnv, isIndexableDeployment } from '@/shared/config/env';
import { abs, localeAlternates, siteUrl } from '@/shared/seo/seo';

async function fetchProductSlugs() {
  const { apiUrl, apiMocking, tenantId } = getPublicEnv();
  if (!apiUrl || apiUrl === 'mock' || apiMocking) {
    return [];
  }

  try {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/products`;
    const headers = new Headers({ Accept: 'application/json' });
    if (tenantId) {
      headers.set('X-Tenant-ID', tenantId);
    }

    const response = await fetch(endpoint, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data: unknown = await response.json();
    const direct = productListSchema.safeParse(data);
    if (direct.success) {
      return direct.data.map((product) => product.slug);
    }

    // The catalog contract wraps list results in `{ data, pagination }`.
    if (typeof data === 'object' && data !== null && 'data' in data) {
      const wrapped = productListSchema.safeParse(data.data);
      if (wrapped.success) {
        return wrapped.data.map((product) => product.slug);
      }
    }

    return [];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch products for sitemap', error);
    }

    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableDeployment()) {
    return [];
  }

  const slugs = await fetchProductSlugs();
  const lastModified = new Date();

  const withAlternates = (path: string, url: string) => {
    const { id, en } = localeAlternates(path);
    return { url, lastModified, alternates: { languages: { id, en } } };
  };

  const entries: MetadataRoute.Sitemap = [
    withAlternates('/', siteUrl),
    withAlternates('/products', abs('/products')),
    ...slugs.map((slug) => withAlternates(`/products/${slug}`, abs(`/products/${slug}`))),
  ];

  return entries;
}
