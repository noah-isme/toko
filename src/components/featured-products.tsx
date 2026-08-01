'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/lib/api';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

export function FeaturedProducts() {
  const { data, isLoading } = useProducts({ limit: 12 });
  const products = [...(data?.data ?? [])]
    .sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
    )
    .slice(0, 8);

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-16">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,hsl(40_55%_64%_/_0.28),transparent_62%)]" />
        <div className="relative max-w-2xl space-y-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(40_65%_77%)]">
            <Sparkles className="h-4 w-4" /> The edit
          </p>
          <h1 className="font-display text-5xl leading-[0.92] sm:text-7xl">
            Pilihan yang pantas untuk disimpan.
          </h1>
          <p className="max-w-lg text-sm leading-7 text-white/75 sm:text-base">
            Koleksi produk favorit dengan kualitas, fungsi, dan detail yang menonjol.
          </p>
          <Button asChild variant="secondary" className="mt-2">
            <Link href="/products">
              Jelajahi semua produk <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Curated for you</p>
            <h2 className="font-display mt-2 text-4xl">Produk unggulan</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Pilihan ini diurutkan dari produk dengan apresiasi pelanggan terbaik.
          </p>
        </div>
        {isLoading ? (
          <ProductCardSkeleton />
        ) : products.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="premium-surface rounded-2xl p-8 text-sm text-muted-foreground">
            Koleksi pilihan segera hadir.
          </p>
        )}
      </section>
    </div>
  );
}
