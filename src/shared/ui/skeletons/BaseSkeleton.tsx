import * as React from 'react';

import { cn } from '@/lib/utils';

export interface BaseSkeletonProps {
  className?: string;
}

export function BaseSkeleton({ className }: BaseSkeletonProps) {
  return (
    <React.Fragment>
      <div
        aria-hidden="true"
        className={cn('pointer-events-none animate-pulse rounded bg-muted/50', className)}
      />
    </React.Fragment>
  );
}
