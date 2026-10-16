import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JsonLd } from '@/shared/seo/JsonLd';
import { productJsonLd } from '@/shared/seo/jsonld';

describe('product JSON-LD', () => {
  it('renders structured product data with price information', () => {
    const data = productJsonLd({
      id: 'prod-123',
      title: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium wireless headphones with noise cancelling.',
      price: 1500000,
      images: ['https://example.com/assets/headphones.png'],
      stock: 12,
      inStock: true,
    });

    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const json = JSON.parse(script?.textContent ?? '{}');
    expect(json['@type']).toBe('Product');
    expect(json.offers.price).toBe('1500000.00');
    expect(json.offers.priceCurrency).toBe('IDR');
  });
});

describe('product JSON-LD in mock mode', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.resetModules();
  });

  it('is populated from the seeded catalog by the product page', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'mock';
    vi.resetModules();
    const { default: ProductPage, generateMetadata } = await import(
      '@/app/(storefront)/products/[slug]/page'
    );
    const params = Promise.resolve({ slug: 'macbook-pro-14-m3' });

    const metadata = await generateMetadata({ params });
    const tree = (await ProductPage({ params })) as React.ReactElement<{
      children: React.ReactElement<{ id?: string; data?: Record<string, any> }>[];
    }>;
    const jsonLd = tree.props.children.find((child) => child.props.id === 'product-jsonld');

    expect(jsonLd?.props.data?.['@type']).toBe('Product');
    expect(jsonLd?.props.data?.name).toBe(metadata.title);
    expect(String(metadata.title)).toMatch(/macbook/i);
    expect(jsonLd?.props.data?.offers?.priceCurrency).toBe('IDR');
  }, 15_000);

  it('renders not-found for an unknown slug', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'mock';
    vi.resetModules();
    const { generateMetadata } = await import('@/app/(storefront)/products/[slug]/page');
    await expect(
      generateMetadata({ params: Promise.resolve({ slug: 'no-such-product' }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  }, 15_000);
});
