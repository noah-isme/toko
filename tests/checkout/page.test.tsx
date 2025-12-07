import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

beforeEach(() => {
  (globalThis as { React?: typeof React }).React = React;
  pushMock.mockClear();
  replaceMock.mockClear();
  prefetchMock.mockClear();
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
  it('selects shipping option after address auto-load and proceeds to draft', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    render(<CheckoutPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Shipping Options')).toBeInTheDocument();
    });

    const shippingChoice = screen.getByText(/JNE - YES/i).closest('label');
    await user.click(shippingChoice!);

    const proceedButton = screen.getByRole('button', { name: /proceed to pay/i });

    await waitFor(() => {
      expect(proceedButton).toBeEnabled();
    });

    await user.click(proceedButton);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
      expect(replaceMock.mock.calls[0][0]).toMatch(/\/checkout\/review\?orderId=/);
    });
  });
});
