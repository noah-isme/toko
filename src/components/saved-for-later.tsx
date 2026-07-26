'use client';

import { Price } from '@/components/price';
import { useAddToCartMutation } from '@/lib/api/hooks';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useSavedForLaterStore } from '@/stores/saved-for-later-store';

interface SavedForLaterProps {
  /** Cart the items are moved back into. */
  cartId: string;
}

export function SavedForLater({ cartId }: SavedForLaterProps) {
  const items = useSavedForLaterStore((state) => state.items);
  const remove = useSavedForLaterStore((state) => state.remove);
  const addToCart = useAddToCartMutation();

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="saved-for-later-heading" className="space-y-4">
      <h2 id="saved-for-later-heading" className="text-lg font-semibold">
        Disimpan untuk nanti ({items.length})
      </h2>
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.productId}
            data-testid="saved-item"
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <GuardedButton
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  isLoading={addToCart.isProductInFlight(item.productId)}
                  loadingLabel="Memindahkan…"
                  onClick={async () => {
                    try {
                      await addToCart.mutateAsync({
                        productId: item.productId,
                        quantity: item.quantity,
                        name: item.name,
                        price: item.price,
                        image: item.image ?? null,
                        maxQuantity: item.maxQuantity,
                        cartId,
                      });
                    } catch {
                      // The mutation surfaces its own error toast. Keep the item
                      // parked: this snapshot is the only remaining record of it,
                      // so dropping it on failure would lose the selection.
                      return;
                    }
                    remove(item.productId);
                  }}
                >
                  Pindahkan ke keranjang
                </GuardedButton>
                <GuardedButton
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => remove(item.productId)}
                >
                  Hapus
                </GuardedButton>
              </div>
            </div>
            <Price amount={item.price.amount * item.quantity} currency={item.price.currency} />
          </li>
        ))}
      </ul>
    </section>
  );
}
