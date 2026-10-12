'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/entities/catalog/hooks';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

export function FeaturedProducts() {
  const t = useTranslations('common.landing.featured');
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
            <Sparkles className="h-4 w-4" /> {t('eyebrow')}
          </p>
          <h1 className="font-display text-5xl leading-[0.92] sm:text-7xl">{t('title')}</h1>
          <p className="max-w-lg text-sm leading-7 text-white/75 sm:text-base">
            {t('description')}
          </p>
          <Button asChild variant="secondary" className="mt-2">
            <Link href="/products">
              {t('browse')} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t('curatedEyebrow')}</p>
            <h2 className="font-display mt-2 text-4xl">{t('curatedTitle')}</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            {t('curatedDescription')}
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
            {t('empty')}
          </p>
        )}
      </section>
    </div>
  );
}
