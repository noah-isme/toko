import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { CartView } from '@/components/cart-view';
import { RouteFocusHandler } from '@/shared/lib/useRouteFocus';

const routerMock = {
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
};

const navigationState = {
  pathname: '/cart',
  searchParams: '',
};

vi.mock('next/navigation', async () => {
  return {
    useRouter: () => routerMock,
    usePathname: () => navigationState.pathname,
    useSearchParams: () => ({
      toString: () => navigationState.searchParams,
    }),
  };
});

vi.mock('@/lib/api/hooks', () => {
  const cartData = {
    id: 'cart-id',
    items: [
      {
        id: 'item-1',
        name: 'Demo Item',
        quantity: 1,
        price: { amount: 1000, currency: 'IDR' },
        maxQuantity: 5,
      },
    ],
    subtotal: { amount: 1000, currency: 'IDR' },
  };

  const mutationStub = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isItemInFlight: () => false,
    isGuardActive: () => false,
  };

  return {
    useCartQuery: () => ({ data: cartData, isLoading: false, isFetching: false }),
    useUpdateCartItemMutation: () => mutationStub,
    useRemoveCartItemMutation: () => mutationStub,
  };
});

describe('checkout transitions', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
    routerMock.prefetch.mockClear();
    navigationState.pathname = '/cart';
    navigationState.searchParams = '';
  });

  it('prefetches checkout route when CTA is focused', () => {
    const { getByRole } = render(<CartView />);

    const cta = getByRole('link', { name: /proceed to checkout/i });
    fireEvent.focus(cta);

    expect(routerMock.prefetch).toHaveBeenCalledWith('/checkout');
  });

  it('scrolls to main content and focuses heading on route change', () => {
    vi.useFakeTimers();

    const main = document.createElement('main');
    main.id = 'main-content';
    const heading = document.createElement('h1');

    const scrollSpy = vi.fn();
    const focusSpy = vi.fn();

    (main.scrollIntoView as unknown) = scrollSpy;
    (heading.focus as unknown) = focusSpy;

    main.appendChild(heading);
    document.body.appendChild(main);

    const { rerender, unmount } = render(<RouteFocusHandler />);

    navigationState.pathname = '/checkout';
    rerender(<RouteFocusHandler />);

    act(() => {
      vi.runAllTimers();
    });

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(focusSpy).toHaveBeenCalled();

    unmount();
    document.body.removeChild(main);
    vi.useRealTimers();
  });
});
