'use client';

import { HeartCrack, HeartOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ProductCard } from '@/components/product-card';
import { useOptionalAuth } from '@/components/providers/AuthProvider';
import { useAllMyAlertsQuery } from '@/entities/alerts/hooks';
import type { AlertSubscription } from '@/entities/alerts/types';
import { PriceDropToggle } from '@/entities/alerts/ui/PriceDropToggle';
import { useFavoritesQuery } from '@/entities/favorites/hooks';
import { getGuestId } from '@/entities/favorites/storage';
import type { FavoriteItem } from '@/entities/favorites/types';
import { emptyFavorites, emptyFavoritesUnavailable } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FavoritesGridSkeleton } from '@/shared/ui/skeletons/FavoritesGridSkeleton';

export default function FavoritesPage() {
  const t = useTranslations('catalog.favoritesPage');
  const tEmpty = useTranslations('common.empty');
  const userId = getGuestId() ?? undefined;
  const { data: favorites, isLoading: isLoadingFavorites } = useFavoritesQuery(userId);
  const isAuthenticated = useOptionalAuth()?.isAuthenticated ?? false;
  // One alerts query for the whole page; per-product queries would send one
  // request per favorite and run into the API rate limits.
  const alertsQuery = useAllMyAlertsQuery({
    enabled: isAuthenticated && (favorites?.length ?? 0) > 0,
  });
  const priceDropByProduct = useMemo(() => {
    const map = new Map<string, AlertSubscription>();
    for (const alert of alertsQuery.data ?? []) {
      if (alert.type === 'PRICE_DROP' && alert.variantId === null) {
        map.set(alert.productId, alert);
      }
    }
    return map;
  }, [alertsQuery.data]);

  if (isLoadingFavorites) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>
        <FavoritesGridSkeleton />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="mb-8 text-3xl font-bold">{t('title')}</h1>
        <EmptyState icon={<HeartOff aria-hidden="true" />} {...emptyFavorites(tEmpty)} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('count', { count: favorites.length })}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {favorites.map((fav: FavoriteItem) => (
          <div key={fav.productId} className="flex flex-col gap-2">
            <ProductCard
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
            <PriceDropToggle
              productId={fav.productId}
              productName={fav.productName}
              alertState={{
                alert: priceDropByProduct.get(fav.productId),
                isLoading: alertsQuery.isLoading,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
