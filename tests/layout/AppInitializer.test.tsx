import { act, render } from '@testing-library/react';

import { AppInitializer } from '@/components/providers/AppInitializer';
import { cartApi } from '@/lib/api/services';
import { useCartStore } from '@/stores/cart-store';

const originalInitGuestCart = useCartStore.getState().initGuestCart;

describe('AppInitializer', () => {
  afterEach(() => {
    act(() => {
      useCartStore.setState({
        anonId: null,
        cartId: null,
        initGuestCart: originalInitGuestCart,
      });
    });
    vi.restoreAllMocks();
  });

  it('bypasses guest cart initialization when anonId was pre-seeded', () => {
    const initGuestCart = vi.fn().mockResolvedValue(undefined);
    act(() => {
      useCartStore.setState({ anonId: 'anon-e2e-seed', initGuestCart });
    });

    const view = render(<AppInitializer />);
    view.rerender(<AppInitializer />);

    expect(initGuestCart).not.toHaveBeenCalled();
  });

  it('starts initialization once across re-renders', () => {
    const initGuestCart = vi.fn().mockResolvedValue(undefined);
    act(() => {
      useCartStore.setState({ anonId: null, initGuestCart });
    });

    const view = render(<AppInitializer />);
    view.rerender(<AppInitializer />);
    view.rerender(<AppInitializer />);

    expect(initGuestCart).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent store initialization calls into one request', async () => {
    let resolveCart!: (value: { cartId: string; anonId: string }) => void;
    const response = new Promise<{ cartId: string; anonId: string }>((resolve) => {
      resolveCart = resolve;
    });
    const createCart = vi.spyOn(cartApi, 'createCart').mockReturnValue(response);

    const first = originalInitGuestCart();
    const second = originalInitGuestCart();
    resolveCart({ cartId: 'cart-created', anonId: 'anon-created' });
    await Promise.all([first, second]);

    expect(createCart).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState()).toMatchObject({
      cartId: 'cart-created',
      anonId: 'anon-created',
    });
  });
});
