import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export function CheckoutSkeleton() {
  return (
    <React.Fragment>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" role="status">
        {srOnly('Memuat...')}
        <div className="space-y-6 rounded-lg border border-border/60 bg-muted/20 p-6">
          <div className="space-y-4">
            <BaseSkeleton className="h-6 w-1/3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <BaseSkeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <BaseSkeleton className="h-6 w-1/3" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <BaseSkeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <BaseSkeleton className="h-12 w-48" />
        </div>
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-6">
          <BaseSkeleton className="h-6 w-1/2" />
          {Array.from({ length: 4 }).map((_, index) => (
            <BaseSkeleton key={index} className="h-4 w-full" />
          ))}
          <div className="space-y-2 pt-2">
            <BaseSkeleton className="h-4 w-2/3" />
            <BaseSkeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
