import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const prefetchMock = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
      prefetch: prefetchMock,
    }),
  };
});

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
  }),
}));

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  replaceMock.mockClear();
  prefetchMock.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Set a cartId in localStorage so CheckoutPage can find the mock cart
  const mockCart = (globalThis as { __tokoCartMock?: { id: string } }).__tokoCartMock;
  if (mockCart?.id) {
    window.localStorage.setItem('cartId', mockCart.id);
  }
});

import CheckoutPage from '@/app/(storefront)/checkout/page';
import { writeGuestAddresses } from '@/entities/address/storage';
import { getAddressListKey } from '@/entities/address/keys';
import type { Address } from '@/entities/address/types';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('CheckoutPage', () => {
  it('selects shipping option and proceeds to confirmation', async () => {
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

    server.use(
      http.post(apiPath('/carts/:cartId/quote/shipping'), () =>
        HttpResponse.json({
          data: [
            {
              service: 'REG',
              description: 'JNE Reguler',
              cost: 15000,
              etd: '2-3 Hari',
            },
          ],
        }),
      ),
      http.post(apiPath('/checkout'), () =>
        HttpResponse.json({
          data: {
            orderId: 'order-checkout-1',
            orderNumber: 'ORD-0001',
            status: 'pending_payment',
            total: 250000,
          },
        }),
      ),
    );

    const user = userEvent.setup();
    const queryClient = createQueryClient();
    // Pre-populate queryClient so address list is immediately available
    queryClient.setQueryData(getAddressListKey('user-1'), seed);

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    await user.click(await screen.findByRole('radio', { name: /primary user/i }, { timeout: 5000 }));

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: /transfer bank/i }));

    const proceedButton = screen.getByRole('button', { name: /bayar sekarang/i });

    await waitFor(() => {
      expect(proceedButton).toBeEnabled();
    });

    await user.click(proceedButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/order/confirmation/order-checkout-1');
    });
  });
});
