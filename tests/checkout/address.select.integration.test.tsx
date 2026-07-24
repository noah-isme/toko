import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutPage from '@/app/(storefront)/checkout/page';
import { getAddressListKey } from '@/entities/address/keys';
import { writeGuestAddresses } from '@/entities/address/storage';
import type { Address } from '@/entities/address/types';

const replaceMock = vi.fn();
const prefetchMock = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      replace: replaceMock,
      push: vi.fn(),
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('CheckoutPage address selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    replaceMock.mockClear();
    // Set a cartId so CheckoutPage finds the mock cart
    const mockCart = (globalThis as { __tokoCartMock?: { id: string } }).__tokoCartMock;
    if (mockCart?.id) {
      window.localStorage.setItem('cartId', mockCart.id);
    }
  });

  it('prefills default address and allows selecting a different one', async () => {
    const seed: Address[] = [
      {
        id: 'addr-primary',
        receiverName: 'Primary User',
        phone: '0811111111',
        addressLine1: 'Jl. Utama',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12120',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'addr-secondary',
        receiverName: 'Secondary User',
        phone: '0822222222',
        addressLine1: 'Jl. Kedua',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        country: 'ID',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    writeGuestAddresses(seed);

    const user = userEvent.setup();
    const queryClient = createQueryClient();
    // Pre-populate queryClient so address list is immediately available
    queryClient.setQueryData(getAddressListKey('user-1'), seed);

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alamat pengiriman')).toBeInTheDocument();
    });

    // Wait for address list to appear and pick alternative address
    const secondaryAddress = await screen.findByRole(
      'radio',
      { name: /secondary user/i },
      { timeout: 5000 },
    );
    await user.click(secondaryAddress);

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Bandung/i).length).toBeGreaterThan(0);
    });
  });

  it('disables checkout when no address is available', async () => {
    const queryClient = createQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Belum ada alamat terpilih/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Shipping Options')).toBeNull();
    expect(screen.getByRole('button', { name: /bayar sekarang/i })).toBeDisabled();
  });
});
