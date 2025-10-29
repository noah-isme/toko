import * as React from 'react';

import { srOnly } from '../a11y';

import { BaseSkeleton } from './BaseSkeleton';

export interface OrdersTableSkeletonProps {
  rows?: number;
}

export function OrdersTableSkeleton({ rows = 8 }: OrdersTableSkeletonProps) {
  return (
    <React.Fragment>
      <div className="overflow-hidden rounded-lg border" role="status">
        {srOnly('Memuat...')}
        <table className="min-w-full divide-y divide-border/60">
          <thead className="bg-muted/30">
            <tr>
              {Array.from({ length: 4 }).map((_, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                >
                  <BaseSkeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-background">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="bg-background">
                {Array.from({ length: 4 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <BaseSkeleton className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}
