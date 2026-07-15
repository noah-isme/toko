'use client';

import { HeartCrack, HeartOff } from 'lucide-react';
import { useMemo } from 'react';

import { ProductCard } from '@/components/product-card';
import { useFavoritesQuery } from '@/entities/favorites/hooks';
import { getGuestId } from '@/entities/favorites/storage';
import { useProducts } from '@/lib/api';
import { emptyFavorites, emptyFavoritesUnavailable } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FavoritesGridSkeleton } from '@/shared/ui/skeletons/FavoritesGridSkeleton';

export default function FavoritesPage() {
  const userId = getGuestId() ?? undefined;
  const { data: favorites, isLoading: isLoadingFavorites } = useFavoritesQuery(userId);
  const { data: rawProductsData } = useProducts();
  const products = rawProductsData?.data;

  const favoriteProducts = useMemo(() => {
    if (!favorites || !products) return [];

    const favoriteIds = new Set(favorites.map((fav) => fav.productId));
    return products.filter((product) => favoriteIds.has(product.id));
  }, [favorites, products]);

  if (isLoadingFavorites) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">Favorit Saya</h1>
        <FavoritesGridSkeleton />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">Favorit Saya</h1>
        <EmptyState icon={<HeartOff aria-hidden="true" />} {...emptyFavorites()} />
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
        <EmptyState icon={<HeartCrack aria-hidden="true" />} {...emptyFavoritesUnavailable()} />
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
