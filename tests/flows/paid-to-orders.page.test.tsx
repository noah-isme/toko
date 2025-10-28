import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutReviewPage from '@/app/(storefront)/checkout/review/page';
import CheckoutSuccessPage from '@/app/(storefront)/checkout/success/page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentOrderId = 'order-flow-123';

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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('paid flow redirects to orders', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    currentOrderId = 'order-flow-123';
    (globalThis as { React?: typeof React }).React = React;
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.open = vi.fn() as unknown as typeof window.open;

    const orderDraft = {
      cartId: currentOrderId,
      address: {
        fullName: 'John Doe',
        phone: '0812345678',
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        district: 'Kebayoran Baru',
        postalCode: '12120',
        detail: 'Jl. Melati No. 10',
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
    };

    window.sessionStorage.setItem(
      `checkout:orderDraft:${currentOrderId}`,
      JSON.stringify(orderDraft),
    );
    window.sessionStorage.setItem('checkout:orderDraft:latest', currentOrderId);
  });

  it('invalidates caches, redirects, and exposes order detail link', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    render(<CheckoutReviewPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Review Pesanan/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /bayar sekarang/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saya sudah membayar/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /saya sudah membayar/i }));

    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalledWith(`/checkout/success?orderId=${currentOrderId}`);
      },
      { timeout: 10000 },
    );

    const invalidatedKeys = invalidateSpy.mock.calls.map(([args]) => args?.queryKey);

    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([['cart', currentOrderId], ['cart'], ['orders']]),
    );

    render(<CheckoutSuccessPage />);

    const detailLink = await screen.findByRole('link', { name: /lihat detail pesanan/i });
    expect(detailLink.getAttribute('href')).toContain(`/orders/${currentOrderId}`);
  });
});
