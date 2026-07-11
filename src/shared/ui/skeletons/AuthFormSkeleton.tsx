import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export function AuthFormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6" role="status">
      {srOnly('Memuat...')}
      <div className="space-y-2 text-center">
        <BaseSkeleton className="mx-auto h-7 w-40" />
        <BaseSkeleton className="mx-auto h-4 w-56" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <BaseSkeleton className="h-4 w-20" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <BaseSkeleton className="h-4 w-24" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <BaseSkeleton className="h-4 w-24" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
        <BaseSkeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
