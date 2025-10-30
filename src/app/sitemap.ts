import type { MetadataRoute } from 'next';

import { productListSchema } from '@/lib/api/schemas';
import { abs, siteUrl } from '@/shared/seo/seo';

async function fetchProductSlugs() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl === 'mock') {
    return [];
  }

  try {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/products`;
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const parsed = productListSchema.safeParse(data);
    if (!parsed.success) {
      return [];
    }

    return parsed.data.map((product) => product.slug);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch products for sitemap', error);
    }

    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchProductSlugs();
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified,
    },
    {
      url: abs('/products'),
      lastModified,
    },
    ...slugs.map((slug) => ({
      url: abs(`/products/${slug}`),
      lastModified,
    })),
  ];

  return entries;
}
