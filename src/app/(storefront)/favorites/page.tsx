'use client';

import { useMemo } from 'react';

import { ProductCard } from '@/components/product-card';
import { useFavoritesQuery } from '@/entities/favorites/hooks';
import { getGuestId } from '@/entities/favorites/storage';
import { useProductsQuery } from '@/lib/api/hooks';
import { EmptyState } from '@/shared/ui/EmptyState';

export default function FavoritesPage() {
  const userId = getGuestId() ?? undefined;
  const { data: favorites, isLoading: isLoadingFavorites } = useFavoritesQuery(userId);
  const { data: products } = useProductsQuery();

  const favoriteProducts = useMemo(() => {
    if (!favorites || !products) return [];

    const favoriteIds = new Set(favorites.map((fav) => fav.productId));
    return products.filter((product) => favoriteIds.has(product.id));
  }, [favorites, products]);

  if (isLoadingFavorites) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">Favorit Saya</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">Favorit Saya</h1>
        <EmptyState
          title="Belum ada favorit"
          description="Mulai tambahkan produk favorit Anda dengan menekan tombol hati pada produk."
          cta={{ label: 'Lihat Produk', href: '/products' }}
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Favorit Saya</h1>
        <p className="text-muted-foreground">
          {favorites.length} {favorites.length === 1 ? 'produk' : 'produk'}
        </p>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Produk favorit tidak tersedia saat ini. Mungkin sudah tidak dijual lagi.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
