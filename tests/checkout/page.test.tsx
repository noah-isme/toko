import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
    }),
  };
});

beforeEach(() => {
  pushMock.mockClear();
  window.localStorage.clear();
});

import CheckoutPage from '@/app/(storefront)/checkout/page';

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
  it('submits address, selects shipping, and proceeds to draft creation', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

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

    const options = screen.getAllByRole('radio');
    await user.click(options[1]);

    const proceedButton = screen.getByRole('button', { name: /proceed to pay/i });

    await waitFor(() => {
      expect(proceedButton).toBeEnabled();
    });

    await user.click(proceedButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
      expect(pushMock.mock.calls[0][0]).toMatch(/\/checkout\/review\?orderId=/);
    });
  });
});
