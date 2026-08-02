'use client';

import { Flame, ArrowRight, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import {
  promotionsApi,
  type FlashSaleCampaign,
  type FlashSaleItem,
} from '@/lib/api/services/promotions';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';
import { useCartStore } from '@/stores/cart-store';

export function FlashSaleSection() {
  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId } = useCartStore();

  const [campaigns, setCampaigns] = useState<FlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    promotionsApi
      .listFlashSales()
      .then((items) => {
        if (!cancelled) setCampaigns(items);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat flash sale.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = campaigns.find(
    (campaign) =>
      new Date(campaign.startsAt).getTime() <= now && new Date(campaign.endsAt).getTime() > now,
  );

  if (loading) {
    return <FlashSaleSkeleton />;
  }

  if (error || !active || active.items.length === 0) {
    return null;
  }

  const items = active.items.slice(0, 4);
  const timeLeft = countdown(active.endsAt, now);

  const handleAdd = (item: FlashSaleItem) => {
    if (!cartId || item.stock <= 0) return;
    mutate({
      productId: item.productId,
      campaignId: active.id,
      quantity: 1,
      name: item.title,
      price: { amount: item.salePrice, currency: 'IDR' },
      image: item.thumbnail ?? '',
      maxQuantity: item.stock,
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
        {items.map((item) => {
          const discountPct = Math.round(item.discountBps / 100);
          const image = item.thumbnail || '';
          const isAdding = isProductInFlight(item.productId);

          return (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-background p-3.5 transition-all duration-150 hover:border-primary/50 hover:shadow-md"
            >
              {/* Product Image & Badges */}
              <div className="space-y-3">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="(min-width: 768px) 25vw, 50vw"
                    />
                  ) : null}
                  <span className="shadow-xs absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                    -{discountPct}%
                  </span>
                  <div className="absolute right-2 top-2">
                    <FavToggle productId={item.productId} size="sm" />
                  </div>
                </div>

                <Link href={`/products/${item.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                    {item.title}
                  </h3>
                </Link>
              </div>

              {/* Price & Add to Cart */}
              <div className="mt-4 space-y-3 border-t border-border/40 pt-3">
                <div>
                  <div className="text-xs text-muted-foreground line-through">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                      item.originalPrice,
                    )}
                  </div>
                  <Price
                    amount={item.salePrice}
                    currency="IDR"
                    className="text-base font-extrabold tracking-tight text-foreground"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full gap-2 transition-transform duration-150 active:scale-[0.98]"
                  onClick={() => handleAdd(item)}
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
          href="/flash-sales"
          className="inline-flex items-center text-xs font-bold text-primary hover:underline"
        >
          Lihat Semua Flash Sale <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

function countdown(target: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
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
