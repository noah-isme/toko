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
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function LandingHero() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {/* Main Promo Bento Card (2 cols wide on desktop) */}
      <div className="shadow-xs relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 lg:col-span-2">
        <div className="max-w-xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Platform Belanja Resmi</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Belanja Produk Original, <span className="text-primary">Harga Terbaik Hari Ini.</span>
          </h1>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Nikmati promo spesial, garansi resmi 100% original, dan gratis ongkir ke seluruh
            Indonesia tanpa syarat tersembunyi.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-primary font-bold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
            >
              <Link href="/products">
                Mulai Belanja Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-semibold transition-all duration-150 active:scale-[0.98]"
            >
              <Link href="/register">Daftar Akun Gratis</Link>
            </Button>
          </div>
        </div>

        {/* Benefit Items Footer */}
        <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Gratis Ongkir</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="truncate">Garansi 100%</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="truncate">Bayar Aman</span>
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
            <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
              s.d 50%
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-foreground">Diskon Musim Ini</h3>
            <p className="text-xs text-muted-foreground">Cek promo terpanas & flash deals</p>
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
            <h3 className="text-sm font-bold text-foreground">Gadget & Elektronik</h3>
            <p className="text-xs text-muted-foreground">Laptop, Smartphone, & Aksesori</p>
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
            <h3 className="text-sm font-bold text-foreground">Fashion & Gaya</h3>
            <p className="text-xs text-muted-foreground">Pakaian Pria & Wanita Terbaru</p>
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
            <h3 className="text-sm font-bold text-foreground">Produk Terbaru</h3>
            <p className="text-xs text-muted-foreground">Koleksi minggu ini</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
