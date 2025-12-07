import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAddressHandlers } from '../address/utils';

import CheckoutPage from '@/app/(storefront)/checkout/page';
import type { Address } from '@/entities/address/types';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

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
    replaceMock.mockClear();
  });

  it('prefills default address and allows selecting a different one', async () => {
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
      {
        id: 'addr-secondary',
        fullName: 'Secondary User',
        phone: '0822222222',
        line1: 'Jl. Kedua',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        country: 'ID',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockAddressHandlers(seed);

    const user = userEvent.setup();
    const queryClient = createQueryClient();

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alamat pengiriman')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    // pick alternative address from inline list
    const secondaryAddress = screen.getByRole('radio', { name: /secondary/i });
    await user.click(secondaryAddress);

    await waitFor(() => {
      expect(screen.getByText(/Bandung/i)).toBeInTheDocument();
    });
  });

  it('disables checkout when no address is available', async () => {
    server.use(http.get(apiPath('/addresses'), () => HttpResponse.json([])));

    const queryClient = createQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Belum ada alamat terpilih/i)).toBeInTheDocument();
    });

    const proceedButton = screen.getByRole('button', { name: /proceed to pay/i });
    expect(proceedButton).toBeDisabled();
    expect(screen.getByText(/Lengkapi alamat pengiriman/i)).toBeInTheDocument();
  });
});
