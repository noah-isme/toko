'use client';

import { HeartCrack, HeartOff } from 'lucide-react';

import { ProductCard } from '@/components/product-card';
import { useFavoritesQuery } from '@/entities/favorites/hooks';
import { getGuestId } from '@/entities/favorites/storage';
import type { FavoriteItem } from '@/entities/favorites/types';
import { emptyFavorites, emptyFavoritesUnavailable } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FavoritesGridSkeleton } from '@/shared/ui/skeletons/FavoritesGridSkeleton';

export default function FavoritesPage() {
  const userId = getGuestId() ?? undefined;
  const { data: favorites, isLoading: isLoadingFavorites } = useFavoritesQuery(userId);

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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((fav: FavoriteItem) => (
          <ProductCard
            key={fav.productId}
            product={{
              id: fav.productId,
              slug: fav.productSlug,
              title: fav.productName,
              price: fav.price,
              imageUrl: fav.imageUrl,
              rating: 0,
              reviewCount: 0,
              inStock: true,
              stock: 10,
              currency: 'IDR',
            }}
          />
        ))}
      </div>
    </div>
  );
}
