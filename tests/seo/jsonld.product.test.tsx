import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

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
