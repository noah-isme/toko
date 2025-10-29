'use client';

import Link from 'next/link';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/lib/api/hooks';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';

export function CartView() {
  const { data, isLoading, isFetching } = useCartQuery();
  const updateItemMutation = useUpdateCartItemMutation();
  const removeItemMutation = useRemoveCartItemMutation();
  const isBusy = isLoading || (!data && isFetching);

  if (isBusy) {
    return <CartSkeleton />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState {...emptyCart()} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shopping cart</h1>
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
                    onClick={() =>
                      removeItemMutation.mutate({
                        itemId: item.id,
                        cartId: data.id,
                      })
                    }
                    disabled={isUpdating}
                    isLoading={removeItemMutation.isItemInFlight(item.id)}
                    loadingLabel="Menghapus…"
                    className="ml-2"
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
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <Price
          amount={data.subtotal.amount}
          currency={data.subtotal.currency}
          className="text-lg"
        />
      </div>
      <Button asChild size="lg">
        <Link href="/checkout">Proceed to checkout</Link>
      </Button>
    </div>
  );
}
