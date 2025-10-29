import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentOrderId = 'order-guarded-1';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
    }),
    useSearchParams: () => new URLSearchParams(currentOrderId ? `orderId=${currentOrderId}` : ''),
  };
});

import CheckoutPage from '@/app/(storefront)/checkout/page';
import CheckoutReviewPage from '@/app/(storefront)/checkout/review/page';
import { OrderDraftSchema } from '@/entities/checkout/schemas';
import { PaymentIntentSchema, PaymentStatusSchema } from '@/entities/payment/schemas';
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
    currentOrderId = 'order-guarded-1';
    (globalThis as { React?: typeof React }).React = React;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('prevents duplicate draft submission and shows success feedback', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const Wrapper = createWrapper(queryClient);

    let draftCallCount = 0;

    server.use(
      http.post(apiPath('/checkout/draft'), async ({ request }) => {
        draftCallCount += 1;
        const payload = await request.json();
        await new Promise((resolve) => setTimeout(resolve, 75));

        return HttpResponse.json(
          OrderDraftSchema.parse({
            cartId: payload.cartId,
            address: payload.address,
            shippingOption: {
              id: payload.shippingOptionId,
              courier: 'Test Courier',
              service: 'Express',
              etd: '1 Hari',
              cost: 20000,
            },
            totals: {
              subtotal: 200000,
              discount: 0,
              tax: 22000,
              shipping: 20000,
              total: 242000,
            },
          }),
        );
      }),
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Phone'), '08123456789');
    await user.type(screen.getByLabelText('Province'), 'DKI Jakarta');
    await user.type(screen.getByLabelText('City'), 'Jakarta Selatan');
    await user.type(screen.getByLabelText('District'), 'Kebayoran Baru');
    await user.type(screen.getByLabelText('Postal Code'), '12120');
    await user.type(screen.getByLabelText('Address Detail'), 'Jl. Senopati No. 12');

    await user.click(screen.getByRole('button', { name: /get shipping options/i }));

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    const proceedButton = screen.getByRole('button', { name: /proceed to pay/i });

    await user.dblClick(proceedButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });

    expect(draftCallCount).toBe(1);

    await waitFor(() => {
      expect(screen.getByText('Draft pesanan berhasil dibuat')).toBeInTheDocument();
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
        const payload = await request.json();

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

        return HttpResponse.json(
          PaymentIntentSchema.parse({
            orderId: payload.orderId,
            provider: payload.provider,
            channel: payload.channel ?? 'snap',
            token: 'mock-token-guarded',
            redirectUrl: 'https://mock.pay/redirect/guarded',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          }),
        );
      }),
      http.get(apiPath('/payments/status'), ({ request }) => {
        const url = new URL(request.url);
        const requestedOrderId = url.searchParams.get('orderId') ?? orderId;

        return HttpResponse.json(
          PaymentStatusSchema.parse({
            orderId: requestedOrderId,
            status: 'PAID',
            provider: 'midtrans',
            raw: { checks: 1 },
          }),
        );
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
