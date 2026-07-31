'use client';

import Image from 'next/image';
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
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Keranjang Belanja
          </h1>
          <p className="text-xs text-muted-foreground">
            Tinjau produk sebelum melanjutkan ke pembayaran
          </p>
        </div>
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
              <div className="flex items-start gap-4">
                {item.image ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : null}
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
                      Simpan Nanti
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
              </div>
              <Price amount={item.price.amount * item.quantity} currency={item.price.currency} />
            </li>
          );
        })}
      </ul>

      <SavedForLater cartId={data.id} />

      <PromoField cartId={cartId || data.id} />

      {/* Order Summary Card */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Ringkasan Pesanan
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal ({data.itemCount} barang)</span>
            <Price
              amount={data.subtotal.amount}
              currency={data.subtotal.currency}
              className="font-bold text-foreground"
            />
          </div>
          {(data as any).totals?.discount ? (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span>Diskon</span>
              <span className="font-bold">
                -
                <Price
                  amount={(data as any).totals.discount}
                  currency={data.subtotal.currency}
                  className="font-bold text-emerald-600 dark:text-emerald-400"
                />
              </span>
            </div>
          ) : null}
          {(data as any).totals?.tax ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pajak</span>
              <Price
                amount={(data as any).totals.tax}
                currency={data.subtotal.currency}
                className="font-semibold text-foreground"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">Total</span>
            <Price
              amount={data.subtotal.amount}
              currency={data.subtotal.currency}
              className="text-lg font-extrabold tracking-tight text-foreground"
            />
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="min-h-[44px] w-full font-bold transition-all duration-150 active:scale-[0.99]"
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
          <Link href="/checkout">Lanjut ke Pembayaran →</Link>
        </Button>
      </div>
    </div>
  );
}
