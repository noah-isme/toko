'use client';

import { Flame, ArrowRight, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { useProducts, Product } from '@/lib/api';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';
import { useCartStore } from '@/stores/cart-store';

export function FlashSaleSection() {
  const { data: rawProducts, isLoading } = useProducts();
  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId } = useCartStore();

  // Live Countdown Timer (Target: 5 hours from now)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashProducts: Product[] = rawProducts?.data?.slice(0, 4) || [];

  if (isLoading) {
    return <FlashSaleSkeleton />;
  }

  if (flashProducts.length === 0) {
    return null;
  }

  const handleAddToCart = (product: Product) => {
    if (!cartId) return;
    const image = product.imageUrl || (product.images && product.images[0]) || '';
    mutate({
      productId: product.id,
      quantity: 1,
      name: product.title,
      price: { amount: product.price, currency: product.currency || 'IDR' },
      image,
      maxQuantity: product.stock,
      cartId,
    });
  };

  return (
    <section className="shadow-xs space-y-6 rounded-2xl border border-border bg-card p-6">
      {/* Header with Title & Timer */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                Flash Sale Hari Ini
              </h2>
              <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                HOT
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Diskon spesial berakhir dalam waktu terbatas
            </p>
          </div>
        </div>

        {/* Live Timer Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">Berakhir dalam:</span>
          <TimerBlock value={timeLeft.hours} label="Jam" />
          <span className="font-bold text-muted-foreground">:</span>
          <TimerBlock value={timeLeft.minutes} label="Min" />
          <span className="font-bold text-muted-foreground">:</span>
          <TimerBlock value={timeLeft.seconds} label="Det" />
        </div>
      </div>

      {/* Product Items Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {flashProducts.map((product: Product, idx: number) => {
          const discountPct = 15 + ((idx * 7) % 25);
          const originalPrice = Math.round(product.price * (1 + discountPct / 100));
          const image = product.imageUrl || (product.images && product.images[0]) || '';
          const isAdding = isProductInFlight(product.id);

          return (
            <div
              key={product.id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-background p-3.5 transition-all duration-150 hover:border-primary/50 hover:shadow-md"
            >
              {/* Product Image & Badges */}
              <div className="space-y-3">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="(min-width: 768px) 25vw, 50vw"
                    />
                  ) : null}
                  <span className="shadow-xs absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                    -{discountPct}%
                  </span>
                  <div className="absolute right-2 top-2">
                    <FavToggle productId={product.id} size="sm" />
                  </div>
                </div>

                <Link href={`/products/${product.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                    {product.title}
                  </h3>
                </Link>
              </div>

              {/* Price & Add to Cart */}
              <div className="mt-4 space-y-3 border-t border-border/40 pt-3">
                <div>
                  <div className="text-xs text-muted-foreground line-through">
                    Rp {originalPrice.toLocaleString('id-ID')}
                  </div>
                  <Price
                    amount={product.price}
                    currency={product.currency || 'IDR'}
                    className="text-base font-extrabold tracking-tight text-foreground"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full gap-2 transition-transform duration-150 active:scale-[0.98]"
                  onClick={() => handleAddToCart(product)}
                  disabled={isAdding}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{isAdding ? 'Menambahkan...' : 'Beli Sekarang'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/products"
          className="inline-flex items-center text-xs font-bold text-primary hover:underline"
        >
          Lihat Semua Produk Flash Sale <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

function TimerBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-7 w-8 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-extrabold text-foreground">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[9px] uppercase text-muted-foreground">{label}</span>
    </div>
  );
}

function FlashSaleSkeleton() {
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <BaseSkeleton className="h-8 w-48" />
        <BaseSkeleton className="h-8 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BaseSkeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
