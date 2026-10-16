import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { CartDrawer } from '@/components/cart-drawer';
import { CartView } from '@/components/cart-view';
import { QuantityPicker } from '@/components/quantity-picker';
import { SavedForLater } from '@/components/saved-for-later';
import type { CartView as CartData } from '@/lib/api/schemas';
import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';
import { useCartStore } from '@/stores/cart-store';
import { useSavedForLaterStore } from '@/stores/saved-for-later-store';

const { state, mutation } = vi.hoisted(() => ({
  state: { cart: null as unknown },
  mutation: () => ({
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
    isItemInFlight: () => false,
    isProductInFlight: () => false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/cart',
}));
vi.mock('@/entities/cart/hooks', () => ({
  useCartQuery: () => ({ data: state.cart, isLoading: false, isFetching: false }),
  useAddToCartMutation: mutation,
  useUpdateCartItemMutation: mutation,
  useRemoveCartItemMutation: mutation,
}));
vi.mock('@/entities/promo/hooks', () => ({
  useApplyPromoMutation: mutation,
  useRemovePromoMutation: mutation,
  useValidatePromoQuery: () => ({ refetch: vi.fn() }),
}));

function buildCart(overrides: Partial<CartData> & Record<string, unknown> = {}): CartData {
  return {
    id: 'cart-1',
    items: [
      {
        id: 'i1',
        productId: 'p1',
        variantId: null,
        name: 'Oak Chair',
        quantity: 2,
        price: { amount: 100000, currency: 'IDR' },
        image: null,
        maxQuantity: 5,
      },
    ],
    itemCount: 2,
    subtotal: { amount: 200000, currency: 'IDR' },
    ...overrides,
  } as CartData;
}

beforeEach(() => {
  state.cart = buildCart();
  useCartStore.setState({ cartId: 'cart-1' });
  useSavedForLaterStore.setState({ items: [] });
});

describe('cart page in English', () => {
  it('translates the header, line item controls and order summary', () => {
    state.cart = buildCart({ totals: { discount: 10000, tax: 5000 } });
    renderWithIntl(<CartView />, { locale: 'en' });

    expect(screen.getByRole('heading', { level: 1, name: 'Shopping Cart' })).toBeInTheDocument();
    expect(
      screen.getByText('Review your products before continuing to payment'),
    ).toBeInTheDocument();
    const item = screen.getByTestId('cart-item');
    expect(within(item).getByRole('button', { name: 'Decrease quantity' })).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: 'Increase quantity' })).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: 'Save for Later' })).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order Summary' })).toBeInTheDocument();
    expect(screen.getByText('Subtotal (2 items)')).toBeInTheDocument();
    expect(screen.getByText('Discount')).toBeInTheDocument();
    expect(screen.getByText('Tax')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to Payment →' })).toBeInTheDocument();
    // Promo field rendered inside the cart.
    expect(screen.getByRole('heading', { name: 'Promo Code' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enter code')).toHaveAttribute('placeholder', 'e.g. SAVE10');
    expect(screen.getByText('Enter a promo code to get a discount.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('uses the singular item count in English', () => {
    state.cart = buildCart({ itemCount: 1 });
    renderWithIntl(<CartView />, { locale: 'en' });

    expect(screen.getByText('Subtotal (1 item)')).toBeInTheDocument();
  });

  it('keeps the Indonesian text by default', () => {
    renderWithIntl(<CartView />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Keranjang Belanja' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Subtotal (2 barang)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lanjut ke Pembayaran →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Nanti' })).toBeInTheDocument();
  });

  it('shows the applied promo in English', () => {
    state.cart = buildCart({
      promoInfo: { code: 'SAVE10' },
      totals: { discount: 10000 },
    });
    renderWithIntl(<CartView />, { locale: 'en' });

    expect(screen.getByText('Code SAVE10 active')).toBeInTheDocument();
    expect(screen.getByText('Code SAVE10 is active.')).toBeInTheDocument();
    expect(screen.getByText(/^Discount:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove code' })).toBeInTheDocument();
  });
});

describe('saved for later in English', () => {
  it('translates the heading and actions', () => {
    useSavedForLaterStore.setState({
      items: [
        {
          productId: 'p9',
          name: 'Pine Table',
          quantity: 1,
          price: { amount: 500000, currency: 'IDR' },
          image: null,
        },
      ],
    });
    renderWithIntl(<SavedForLater cartId="cart-1" />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Saved for later (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to cart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});

describe('cart drawer', () => {
  it('labels the trigger with the item count', () => {
    const { unmount } = renderWithIntl(<CartDrawer />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Open cart with 2 items' })).toBeInTheDocument();
    unmount();

    state.cart = buildCart({ itemCount: 1 });
    const second = renderWithIntl(<CartDrawer />);
    expect(
      screen.getByRole('button', { name: 'Buka keranjang berisi 1 barang' }),
    ).toBeInTheDocument();
    second.unmount();

    state.cart = buildCart({ items: [], itemCount: 0 });
    renderWithIntl(<CartDrawer />);
    expect(screen.getByRole('button', { name: 'Buka keranjang' })).toBeInTheDocument();
  });

  it('translates the sheet contents', async () => {
    const user = userEvent.setup();
    renderWithIntl(<CartDrawer />, { locale: 'en' });

    await user.click(screen.getByRole('button', { name: 'Open cart with 2 items' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Your cart')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(within(dialog).getByText('Qty: 2')).toBeInTheDocument();
    expect(within(dialog).getByText('Subtotal')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Go to checkout' })).toBeInTheDocument();
  });
});

describe('small cart widgets', () => {
  it('translate the quantity picker and loading skeleton', () => {
    renderWithIntl(
      <>
        <QuantityPicker quantity={1} onChange={vi.fn()} />
        <CartSkeleton items={1} />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});
