import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export interface FavoritesGridSkeletonProps {
  items?: number;
}

export function FavoritesGridSkeleton({ items = 8 }: FavoritesGridSkeletonProps) {
  return (
    <div className="space-y-4" role="status">
      {srOnly('Memuat...')}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: items }).map((_, index) => (
          <div key={`favorite-skeleton-${index}`} className="space-y-3 rounded-lg border p-4">
            <BaseSkeleton className="aspect-square w-full" />
            <BaseSkeleton className="h-4 w-3/4" />
            <BaseSkeleton className="h-4 w-1/2" />
            <BaseSkeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
