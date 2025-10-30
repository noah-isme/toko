import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { JsonLd } from '@/shared/seo/JsonLd';
import { orderJsonLd } from '@/shared/seo/jsonld';

describe('order JSON-LD', () => {
  it('serializes order information with order number and total', () => {
    const data = orderJsonLd({
      orderId: 'ORDER-2024',
      url: '/orders/ORDER-2024',
      total: 325000,
      acceptedOffers: [
        {
          name: 'Order total',
          price: 325000,
        },
      ],
    });

    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const json = JSON.parse(script?.textContent ?? '{}');
    expect(json['@type']).toBe('Order');
    expect(json.orderNumber).toBe('ORDER-2024');
    expect(json.price).toBe('325000.00');
  });
});
