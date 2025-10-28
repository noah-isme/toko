import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentOrderId = 'order-123';

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

const mockDraft = {
  cartId: 'order-123',
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
};

beforeEach(() => {
  pushMock.mockClear();
  replaceMock.mockClear();
  currentOrderId = 'order-123';
  (globalThis as { React?: typeof React }).React = React;
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.sessionStorage.setItem(`checkout:orderDraft:${currentOrderId}`, JSON.stringify(mockDraft));
  window.sessionStorage.setItem('checkout:orderDraft:latest', currentOrderId);
});

import CheckoutReviewPage from '@/app/(storefront)/checkout/review/page';

describe('CheckoutReviewPage', () => {
  it('creates a payment intent and redirects after successful status update', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    render(<CheckoutReviewPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Review Pesanan/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /bayar sekarang/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /lanjut ke pembayaran/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /buka pembayaran/i })).toBeInTheDocument();

    expect(screen.getByText(/mock-token-123/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /saya sudah membayar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Status saat ini:/i)).toHaveTextContent('PENDING');
    });

    await waitFor(
      () => {
        expect(pushMock).toHaveBeenCalledWith(`/checkout/success?orderId=${currentOrderId}`);
      },
      { timeout: 10000 },
    );
  }, 15000);
});
