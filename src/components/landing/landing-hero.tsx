'use client';

import {
  ArrowRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CreditCard,
  Tag,
  Laptop,
  Shirt,
  Flame,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function LandingHero() {
  const t = useTranslations('common.landing.hero');
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {/* Main Promo Bento Card (2 cols wide on desktop) */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border/80 bg-card p-7 shadow-[0_24px_60px_-42px_rgba(43,32,22,0.5)] sm:p-10 lg:col-span-2">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,hsl(41_55%_75%_/_0.38),transparent_66%)]" />
        <div className="reveal-up relative max-w-xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1 text-xs font-bold text-primary">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{t('badge')}</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl lg:text-7xl">
            {t.rich('headline', {
              em: (chunks) => <span className="italic text-[hsl(35_46%_42%)]">{chunks}</span>,
            })}
          </h1>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('description')}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-primary font-bold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
            >
              <Link href={'/featured-products' as Route}>
                {t('browse')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-semibold transition-all duration-150 active:scale-[0.98]"
            >
              <Link href="/register">{t('register')}</Link>
            </Button>
          </div>
        </div>

        {/* Benefit Items Footer */}
        <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{t('freeShipping')}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="truncate">{t('guarantee')}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="truncate">{t('securePayment')}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Instant Access Category Bento Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        {/* Card 1: Flash Deal Fast Shortcut */}
        <Link
          href="/products?discount=true"
          className="group flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 transition-all duration-150 hover:border-rose-500/60 hover:bg-rose-500/10 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white">
              <Flame className="h-4 w-4" />
            </div>
            <span className="rounded bg-rose-700 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
              {t('dealsBadge')}
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-foreground">{t('dealsTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('dealsDescription')}</p>
          </div>
        </Link>

        {/* Card 2: Electronics Shortcut */}
        <Link
          href="/products?category=electronics"
          className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Laptop className="h-4 w-4" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-foreground">{t('electronicsTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('electronicsDescription')}</p>
          </div>
        </Link>

        {/* Card 3: Fashion Shortcut */}
        <Link
          href="/products?category=clothing"
          className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shirt className="h-4 w-4" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-foreground">{t('fashionTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('fashionDescription')}</p>
          </div>
        </Link>

        {/* Card 4: New Arrivals */}
        <Link
          href="/products"
          className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Tag className="h-4 w-4" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-3">
            <h2 className="text-sm font-bold text-foreground">{t('newTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('newDescription')}</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
