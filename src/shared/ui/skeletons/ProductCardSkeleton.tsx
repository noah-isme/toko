import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 8 }: ProductCardSkeletonProps) {
  return (
    <React.Fragment>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status">
        {srOnly('Memuat...')}
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
          >
            <BaseSkeleton className="aspect-video w-full" />
            <div className="space-y-2">
              <BaseSkeleton className="h-4 w-3/4" />
              <BaseSkeleton className="h-4 w-1/2" />
            </div>
            <BaseSkeleton className="mt-auto h-10 w-full" />
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}
