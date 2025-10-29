import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export function ProductDetailSkeleton() {
  return (
    <React.Fragment>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" role="status">
        {srOnly('Memuat...')}
        <div className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/20 p-6">
          <BaseSkeleton className="aspect-square w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <BaseSkeleton className="h-8 w-3/4" />
            <BaseSkeleton className="h-6 w-1/3" />
          </div>
          <div className="space-y-2">
            <BaseSkeleton className="h-4 w-full" />
            <BaseSkeleton className="h-4 w-5/6" />
            <BaseSkeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2">
            <BaseSkeleton className="h-4 w-1/2" />
            <BaseSkeleton className="h-4 w-1/3" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <BaseSkeleton className="h-12 w-full sm:w-40" />
            <BaseSkeleton className="h-12 w-full sm:w-40" />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
