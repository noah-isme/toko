'use client';

import {
  Heart,
  Package,
  ShoppingCart,
  ArrowRight,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CategoryQuickNav } from '@/components/landing/category-quick-nav';
import { FlashSaleSection } from '@/components/landing/flash-sale-section';
import { PersonalizedRecommendations } from '@/components/personalized-recommendations';
import { ProductsCatalog } from '@/components/products-catalog';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { useFavoritesQuery } from '@/entities/favorites/hooks';
import { useCartStore } from '@/stores/cart-store';

export function UserHome() {
  const { user, isAuthenticated } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Pengguna';

  const { cart } = useCartStore();
  const { data: favorites } = useFavoritesQuery(user?.id, isAuthenticated);
  const cartItemCount = cart?.items?.length || 0;
  const favoriteCount = favorites?.length || 0;

  const [activeTab, setActiveTab] = useState<'recommended' | 'popular' | 'deals'>('recommended');

  return (
    <div className="space-y-10">
      {/* Personalized Bento Hero Header */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Welcome Card (2 cols) */}
        <div className="relative flex flex-col justify-between space-y-6 overflow-hidden rounded-[2rem] border border-border/80 bg-card p-6 shadow-[0_18px_45px_-36px_rgba(43,32,22,0.5)] sm:p-8 lg:col-span-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Akun Terverifikasi</span>
            </div>
            <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
              Selamat datang kembali, {displayName}!
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Temukan penawaran terbaik dan cek status belanjaan Anda hari ini.
            </p>
          </div>

          {/* Status Tracker Bar */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background p-4 text-xs sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="block font-bold text-foreground">Pesanan Terakhir</span>
                <span className="text-muted-foreground">Dalam proses pengiriman kurir</span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 text-xs font-bold">
              <Link href="/account/orders">Lacak Pesanan</Link>
            </Button>
          </div>
        </div>

        {/* Instant Metrics Bento Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {/* Favorites Metric */}
          <Link
            href="/favorites"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Favorit</div>
                <div className="text-lg font-extrabold text-foreground">{favoriteCount} Produk</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Cart Metric */}
          <Link
            href="/cart"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Keranjang</div>
                <div className="text-lg font-extrabold text-foreground">{cartItemCount} Barang</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Orders History Metric */}
          <Link
            href="/account/orders"
            className="group col-span-2 flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98] lg:col-span-1"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Riwayat</div>
                <div className="text-sm font-bold text-foreground">Lihat Semua Pesanan</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Category Quick Nav */}
      <CategoryQuickNav />

      {/* Flash Sale Banner */}
      <FlashSaleSection />

      {/* Tabbed Recommendation Catalog */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              Katalog Rekomendasi
            </h2>
            <p className="text-xs text-muted-foreground">
              Produk disesuaikan dengan minat dan histori aktivitas Anda
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`rounded-md px-3 py-1.5 transition-all duration-150 ${
                activeTab === 'recommended'
                  ? 'shadow-xs bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Untuk Anda
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`rounded-md px-3 py-1.5 transition-all duration-150 ${
                activeTab === 'popular'
                  ? 'shadow-xs bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Terlaris
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`rounded-md px-3 py-1.5 transition-all duration-150 ${
                activeTab === 'deals'
                  ? 'shadow-xs bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Diskon
            </button>
          </div>
        </div>

        {activeTab === 'recommended' ? (
          <PersonalizedRecommendations limit={8} />
        ) : (
          <ProductsCatalog />
        )}
      </section>
    </div>
  );
}
