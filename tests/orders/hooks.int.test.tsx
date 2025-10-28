import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useOrderQuery, useOrdersQuery } from '@/entities/orders/api/hooks';
import { server } from '@/mocks/server';


type WrapperProps = { children: React.ReactNode };

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('orders hooks', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example.com/api';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
  });

  it('fetches orders list and detail with MSW when API URL is non-mock', async () => {
    const createdAt = new Date().toISOString();
    const listResponse = {
      data: [
        {
          id: 'order-001',
          number: 'INV-001',
          createdAt,
          total: { amount: 250000, currency: 'IDR' },
          paymentStatus: 'PAID',
          fulfillmentStatus: 'SHIPPED',
        },
      ],
      meta: {
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
      },
    } as const;

    const detailResponse = {
      id: 'order-001',
      number: 'INV-001',
      createdAt,
      paymentStatus: 'PAID',
      fulfillmentStatus: 'SHIPPED',
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          name: 'Produk 1',
          quantity: 2,
          price: { amount: 50000, currency: 'IDR' },
          total: { amount: 100000, currency: 'IDR' },
          imageUrl: null,
          variant: null,
        },
      ],
      totals: {
        subtotal: { amount: 200000, currency: 'IDR' },
        shipping: { amount: 15000, currency: 'IDR' },
        discount: null,
        tax: null,
        total: { amount: 215000, currency: 'IDR' },
      },
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '08123456789',
        detail: 'Jl. Merdeka No. 1',
        district: 'Gambir',
        city: 'Jakarta Pusat',
        province: 'DKI Jakarta',
        postalCode: '10110',
        country: 'ID',
      },
      billingAddress: null,
      shippingMethod: {
        id: 'jne-reg',
        label: 'JNE Reguler',
        cost: { amount: 15000, currency: 'IDR' },
        trackingNumber: 'TRK-123',
      },
      statusHistory: [{ status: 'PAID', label: 'Pembayaran diterima', at: createdAt }],
      notes: 'Terima kasih',
    } as const;

    server.use(
      http.get('*/orders', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('limit')).toBe('5');
        expect(url.searchParams.get('status')).toBe('paid');
        return HttpResponse.json(listResponse);
      }),
      http.get('*/orders/:orderId', ({ params }) => {
        expect(params.orderId).toBe('order-001');
        return HttpResponse.json(detailResponse);
      }),
    );

    const queryClient = createQueryClient();

    function Wrapper({ children }: WrapperProps) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result: listResult } = renderHook(
      () => useOrdersQuery({ page: 2, limit: 5, status: 'paid' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(listResult.current.data).toEqual(listResponse);
    });

    const { result: detailResult } = renderHook(() => useOrderQuery('order-001'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(detailResult.current.data).toEqual(detailResponse);
    });
  });
});
