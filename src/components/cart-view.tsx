'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Price } from '@/components/price';
import { SavedForLater } from '@/components/saved-for-later';
import { Button } from '@/components/ui/button';
import { PromoField } from '@/entities/promo/ui/PromoField';
import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/lib/api/hooks';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';
import { useCartStore } from '@/stores/cart-store';
import { useSavedForLaterStore } from '@/stores/saved-for-later-store';

export function CartView() {
  const cartId = useCartStore((state) => state.cartId);
  const { data, isLoading, isFetching } = useCartQuery(cartId || undefined);
  const updateItemMutation = useUpdateCartItemMutation();
  const removeItemMutation = useRemoveCartItemMutation();
  const router = useRouter();
  const saveForLater = useSavedForLaterStore((state) => state.save);
  const isBusy = isLoading || (!data && isFetching);
  const isMutatingCart = updateItemMutation.isPending || removeItemMutation.isPending;

  if (isBusy) {
    return <CartSkeleton />;
  }

  if (!data || data.items.length === 0) {
    // Saving the last item empties the cart, so the parked list has to stay
    // reachable here or it would look like the items vanished.
    return (
      <div className="space-y-6">
        <EmptyState {...emptyCart()} />
        {data ? <SavedForLater cartId={data.id} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Shopping cart</h1>
        <DelayedLoader
          active={isMutatingCart}
          label="Menyimpan perubahan keranjang…"
          className="text-xs sm:text-sm"
        />
      </div>
      <ul className="space-y-4">
        {data.items.map((item) => {
          const isUpdating =
            updateItemMutation.isItemInFlight(item.id) ||
            removeItemMutation.isItemInFlight(item.id);

          const incrementDisabled =
            isUpdating ||
            (typeof item.maxQuantity === 'number' && item.quantity >= item.maxQuantity);
          const decrementDisabled = isUpdating || item.quantity <= 1;

          return (
            <li
              key={item.id}
              data-testid="cart-item"
              className="flex items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <GuardedButton
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        quantity: item.quantity - 1,
                        maxQuantity: item.maxQuantity,
                        cartId: data.id,
                      })
                    }
                    disabled={decrementDisabled}
                    isLoading={updateItemMutation.isItemInFlight(item.id)}
                    loadingLabel="Mengubah jumlah…"
                  >
                    <span className="sr-only">Kurangi jumlah</span>
                    <span aria-hidden="true">−</span>
                  </GuardedButton>
                  <span aria-live="polite">{item.quantity}</span>
                  <GuardedButton
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        quantity: item.quantity + 1,
                        maxQuantity: item.maxQuantity,
                        cartId: data.id,
                      })
                    }
                    disabled={incrementDisabled}
                    isLoading={updateItemMutation.isItemInFlight(item.id)}
                    loadingLabel="Mengubah jumlah…"
                  >
                    <span className="sr-only">Tambah jumlah</span>
                    <span aria-hidden="true">+</span>
                  </GuardedButton>
                  <GuardedButton
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      // Park a snapshot first: once the line leaves the cart the
                      // server no longer knows about it.
                      saveForLater({
                        productId: item.productId,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        image: item.image,
                        maxQuantity: item.maxQuantity,
                      });
                      await removeItemMutation.mutateAsync({
                        itemId: item.id,
                        cartId: data.id,
                      });
                    }}
                    disabled={isUpdating}
                    isLoading={removeItemMutation.isItemInFlight(item.id)}
                    loadingLabel="Menyimpan…"
                    className="ml-2 min-h-[44px]"
                  >
                    Simpan untuk nanti
                  </GuardedButton>
                  <GuardedButton
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      removeItemMutation.mutate({
                        itemId: item.id,
                        cartId: data.id,
                      })
                    }
                    disabled={isUpdating}
                    isLoading={removeItemMutation.isItemInFlight(item.id)}
                    loadingLabel="Menghapus…"
                    className="ml-2 min-h-[44px]"
                  >
                    Hapus
                  </GuardedButton>
                </div>
              </div>
              <Price amount={item.price.amount * item.quantity} currency={item.price.currency} />
            </li>
          );
        })}
      </ul>

      <SavedForLater cartId={data.id} />

      <PromoField cartId={cartId || data.id} />

      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <Price
          amount={data.subtotal.amount}
          currency={data.subtotal.currency}
          className="text-lg"
        />
      </div>
      <Button
        asChild
        size="lg"
        className="min-h-[44px] px-6"
        onFocus={() => {
          if (typeof router.prefetch === 'function') {
            void router.prefetch('/checkout');
          }
        }}
        onMouseEnter={() => {
          if (typeof router.prefetch === 'function') {
            void router.prefetch('/checkout');
          }
        }}
      >
        <Link href="/checkout">Proceed to checkout</Link>
      </Button>
    </div>
  );
}
