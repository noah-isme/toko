import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export function AccountDashboardSkeleton() {
  return (
    <div className="space-y-8" role="status">
      {srOnly('Memuat...')}
      <div className="space-y-2">
        <BaseSkeleton className="h-7 w-48" />
        <BaseSkeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`account-action-${index}`} className="rounded-lg border p-6">
            <BaseSkeleton className="mx-auto h-8 w-8" />
            <BaseSkeleton className="mx-auto mt-4 h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <BaseSkeleton className="h-6 w-32" />
          <BaseSkeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`recent-order-${index}`} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <BaseSkeleton className="h-5 w-36" />
                  <BaseSkeleton className="h-4 w-24" />
                  <BaseSkeleton className="h-3 w-28" />
                </div>
                <BaseSkeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
