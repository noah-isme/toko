'use client';

import { Heart, Package, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ProductsCatalog } from '@/components/products-catalog';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';

/**
 * Authenticated user home page
 * Shows personalized content and quick access to user features
 */
export function UserHome() {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Pengguna';

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Selamat datang, {displayName}! 👋
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Temukan produk terbaik untuk Anda hari ini.
          </p>
        </div>
      </section>

      {/* Quick Access */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAccessCard
          href="/orders"
          icon={Package}
          title="Pesanan Saya"
          description="Lihat status dan riwayat pesanan"
        />
        <QuickAccessCard
          href="/favorites"
          icon={Heart}
          title="Favorit"
          description="Produk yang Anda simpan"
        />
        <QuickAccessCard
          href="/cart"
          icon={ShoppingCart}
          title="Keranjang"
          description="Lanjutkan belanja Anda"
        />
      </section>

      {/* Product Recommendations */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Rekomendasi untuk Anda</h2>
            <p className="text-muted-foreground">Produk pilihan berdasarkan aktivitas Anda</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/products">
              Lihat Semua <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ProductsCatalog />
      </section>
    </div>
  );
}

interface QuickAccessCardProps {
  href: '/orders' | '/favorites' | '/cart' | '/products';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function QuickAccessCard({ href, icon: Icon, title, description }: QuickAccessCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
