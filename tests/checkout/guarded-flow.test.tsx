import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const prefetchMock = vi.fn();
let currentOrderId = 'order-guarded-1';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
      prefetch: prefetchMock,
    }),
    useSearchParams: () => new URLSearchParams(currentOrderId ? `orderId=${currentOrderId}` : ''),
  };
});

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
  }),
}));

import CheckoutPage from '@/app/(storefront)/checkout/page';
import CheckoutReviewPage from '@/app/(storefront)/checkout/review/page';
import { getAddressListKey } from '@/entities/address/keys';
import { writeGuestAddresses } from '@/entities/address/storage';
import type { Address } from '@/entities/address/types';
import { OrderDraftSchema } from '@/entities/checkout/schemas';
import {
  PaymentIntentSchema,
  PaymentStatusSchema,
  type PaymentCreateBody,
} from '@/entities/payment/schemas';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';
import { Toaster } from '@/shared/ui/toast';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    );
  };
}

describe('Guarded checkout and payment flow', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    prefetchMock.mockClear();
    currentOrderId = 'order-guarded-1';
    (globalThis as { React?: typeof React }).React = React;
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Set a cartId so CheckoutPage finds the mock cart
    const mockCart = (globalThis as { __tokoCartMock?: { id: string } }).__tokoCartMock;
    if (mockCart?.id) {
      window.localStorage.setItem('cartId', mockCart.id);
    }
  });

  it('prevents duplicate checkout submission and shows success feedback', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();

    const seed: Address[] = [
      {
        id: 'addr-primary',
        fullName: 'Primary User',
        phone: '0811111111',
        line1: 'Jl. Utama',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12120',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeGuestAddresses(seed);
    // Pre-populate queryClient so address list is immediately available
    queryClient.setQueryData(getAddressListKey('user-1'), seed);

    const Wrapper = createWrapper(queryClient);

    let checkoutCallCount = 0;

    server.use(
      http.post(apiPath('/checkout'), async () => {
        checkoutCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 75));

        return HttpResponse.json({
          data: {
            orderId: 'order-guarded-1',
            orderNumber: 'ORD-GUARDED-1',
            status: 'pending_payment',
            total: 242000,
          },
        });
      }),
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    });

    await user.click(
      await screen.findByRole('radio', { name: /primary user/i }, { timeout: 5000 }),
    );

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: /transfer bank/i }));

    const proceedButton = screen.getByRole('button', { name: /bayar sekarang/i });

    await user.dblClick(proceedButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/checkout/review?orderId=order-guarded-1');
    });

    expect(checkoutCallCount).toBe(1);

    await waitFor(() => {
      expect(screen.getByText('Pesanan berhasil dibuat!')).toBeInTheDocument();
    });
  });

  it('offers guarded retry when payment intent creation fails', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const Wrapper = createWrapper(queryClient);

    const orderId = 'order-guarded-2';
    currentOrderId = orderId;

    const draft = OrderDraftSchema.parse({
      cartId: orderId,
      address: {
        fullName: 'Jane Doe',
        phone: '08123456789',
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        district: 'Kebayoran Baru',
        postalCode: '12120',
        detail: 'Jl. Senopati No. 12',
      },
      shippingOption: {
        id: 'reg',
        courier: 'JNE',
        service: 'REG',
        etd: '2-3 Hari',
        cost: 15000,
      },
      totals: {
        subtotal: 200000,
        discount: 0,
        tax: 22000,
        shipping: 15000,
        total: 237000,
      },
    });

    window.sessionStorage.setItem(`checkout:orderDraft:${orderId}`, JSON.stringify(draft));
    window.sessionStorage.setItem('checkout:orderDraft:latest', orderId);

    let paymentCalls = 0;

    server.use(
      http.post(apiPath('/payments/intent'), async ({ request }) => {
        paymentCalls += 1;
        const payload = (await request.json()) as PaymentCreateBody;

        if (paymentCalls === 1) {
          return HttpResponse.json(
            {
              error: {
                code: 'INTENT_FAILED',
                message: 'Mock payment failure',
              },
            },
            { status: 500 },
          );
        }

        return HttpResponse.json({
          data: PaymentIntentSchema.parse({
            provider: 'midtrans',
            token: 'mock-token-guarded',
            redirectUrl: 'https://mock.pay/redirect/guarded',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          }),
        });
      }),
      http.get(apiPath('/payments/:orderId/status'), () => {
        return HttpResponse.json({
          data: PaymentStatusSchema.parse({
            status: 'PAID',
          }),
        });
      }),
    );

    render(<CheckoutReviewPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Review Pesanan/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /bayar sekarang/i }));

    const retryToast = await screen.findByText('Gagal membuat pembayaran');
    expect(retryToast).toBeInTheDocument();

    const retryButton = await screen.findByRole('button', { name: 'Coba lagi' });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Pembayaran siap dilanjutkan')).toBeInTheDocument();
    });

    expect(paymentCalls).toBe(2);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /lanjut ke pembayaran/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /saya sudah membayar/i }));

    await waitFor(() => {
      expect(screen.getByText('Pembayaran berhasil')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/checkout/success?orderId=${orderId}`);
    });
  });
});
