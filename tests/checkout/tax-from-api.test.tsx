import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    useRouter: () => ({ push: pushMock, replace: replaceMock, prefetch: prefetchMock }),
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
});

import CheckoutPage from '@/app/(storefront)/checkout/page';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Checkout tax comes from the API, not a hardcoded 11%', () => {
  it('renders the server-computed tax value in the Order Summary', async () => {
    // subtotal 200000, tax 30000 == 15%. The frontend fallback would compute
    // Math.round(200000 * 0.11) = 22000. Asserting 30000 proves the API value wins.
    const apiCart = {
      id: 'cart-tax-1',
      anonId: null,
      voucher: null,
      currency: 'IDR',
      pricing: { subtotal: 200000, discount: 0, tax: 30000, shipping: 0, total: 230000 },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          title: 'Contoh Produk',
          slug: 'contoh-produk',
          qty: 2,
          unitPrice: 100000,
          subtotal: 200000,
          imageUrl: undefined,
        },
      ],
    };

    server.use(
      http.get(apiPath('/carts'), () => HttpResponse.json({ data: apiCart })),
      http.get(apiPath('/carts/:cartId'), () => HttpResponse.json({ data: apiCart })),
    );

    const queryClient = createQueryClient();
    render(<CheckoutPage />, {
      wrapper: ({ children }) => <Wrapper client={queryClient}>{children}</Wrapper>,
    });

    // Order Summary renders once the cart (with items) loads.
    await screen.findByText('Order Summary', {}, { timeout: 5000 });

    // The Tax row shows the server value (Rp 30.000,00), NOT the 11% fallback (Rp 22.000,00).
    // "Tax (11%)" is a unique label in the tree, so scope the value assertion to its row.
    const taxRow = screen.getByText('Tax (11%)').closest('div')!;
    expect(within(taxRow).getByText('Rp 30.000,00')).toBeInTheDocument();
    expect(within(taxRow).queryByText('Rp 22.000,00')).not.toBeInTheDocument();

    // Sanity: the subtotal row reflects the same payload.
    const subtotalRow = screen.getByText('Subtotal').closest('div')!;
    expect(subtotalRow).toHaveTextContent('Rp 200.000,00');
  });
});
