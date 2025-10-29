import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export interface CartSkeletonProps {
  items?: number;
}

export function CartSkeleton({ items = 4 }: CartSkeletonProps) {
  return (
    <React.Fragment>
      <div className="space-y-4" role="status">
        {srOnly('Memuat...')}
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
          >
            <BaseSkeleton className="h-16 w-16 rounded-md" />
            <div className="flex-1 space-y-2">
              <BaseSkeleton className="h-4 w-2/3" />
              <BaseSkeleton className="h-4 w-1/2" />
            </div>
            <BaseSkeleton className="h-10 w-16" />
          </div>
        ))}
        <div className="flex justify-end">
          <BaseSkeleton className="h-12 w-48" />
        </div>
      </div>
    </React.Fragment>
  );
}
