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
      status: 'PAID',
      createdAt,
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      },
      items: [
        {
          id: 'line-1',
          productId: 'prod-1',
          productTitle: 'Produk 1',
          productSlug: 'produk-1',
          qty: 2,
          unitPrice: 50000,
          subtotal: 100000,
          imageUrl: null,
        },
      ],
      shippingAddress: {
        receiverName: 'Jane Doe',
        phone: '08123456789',
        addressLine1: 'Jl. Merdeka No. 1',
        city: 'Jakarta Pusat',
        province: 'DKI Jakarta',
        postalCode: '10110',
        country: 'ID',
      },
      pricing: {
        subtotal: 200000,
        shipping: 15000,
        discount: 0,
        tax: 0,
        total: 215000,
      },
      shipping: {
        courier: 'JNE',
        service: 'REG',
        trackingNumber: 'TRK-123',
      },
      currency: 'IDR',
      statusHistory: [{ status: 'PAID', label: 'Pembayaran diterima', at: createdAt }],
      notes: 'Terima kasih',
    } as const;

    server.use(
      http.get('http://localhost:8080/api/v1/orders', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('limit')).toBe('5');
        expect(url.searchParams.get('status')).toBe('paid');
        return HttpResponse.json(listResponse);
      }),
      http.get('http://localhost:8080/api/v1/orders/:orderId', ({ params }) => {
        expect(params.orderId).toBe('order-001');
        return HttpResponse.json({ data: detailResponse });
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
      expect(listResult.current.data).toBeDefined();
      expect(listResult.current.data?.data).toHaveLength(1);
      expect(listResult.current.data?.data[0].id).toBe('order-001');
      expect(listResult.current.data?.meta).toMatchObject({
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
      });
    });

    const { result: detailResult } = renderHook(() => useOrderQuery('order-001'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(detailResult.current.data).toBeDefined();
      expect(detailResult.current.data?.id).toBe('order-001');
    });
  });
});
