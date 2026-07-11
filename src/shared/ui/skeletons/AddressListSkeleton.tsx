import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export interface AddressListSkeletonProps {
  items?: number;
}

export function AddressListSkeleton({ items = 3 }: AddressListSkeletonProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status">
      {srOnly('Memuat...')}
      {Array.from({ length: items }).map((_, index) => (
        <div key={`address-skeleton-${index}`} className="space-y-3 rounded-lg border p-4">
          <BaseSkeleton className="h-5 w-1/3" />
          <BaseSkeleton className="h-4 w-2/3" />
          <BaseSkeleton className="h-3 w-full" />
          <BaseSkeleton className="h-3 w-3/4" />
          <div className="flex gap-2">
            <BaseSkeleton className="h-9 w-24" />
            <BaseSkeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
