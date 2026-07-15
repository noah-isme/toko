import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export function OrderTrackingSkeleton() {
  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 text-center"
      role="status"
    >
      {srOnly('Memuat...')}
      <BaseSkeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <BaseSkeleton className="mx-auto h-7 w-48" />
        <BaseSkeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="w-full space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <BaseSkeleton className="h-4 w-28" />
          <BaseSkeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2 border-t pt-4">
          <BaseSkeleton className="h-4 w-32" />
          <BaseSkeleton className="h-7 w-32" />
        </div>
        <BaseSkeleton className="h-10 w-full" />
      </div>
      <div className="flex w-full gap-3">
        <BaseSkeleton className="h-10 w-full" />
        <BaseSkeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
