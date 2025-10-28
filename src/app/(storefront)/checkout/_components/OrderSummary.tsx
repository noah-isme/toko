'use client';

import React from 'react';

import type { Totals } from '@/entities/checkout/schemas';

export interface OrderSummaryProps {
  totals: Pick<Totals, 'subtotal' | 'discount' | 'tax' | 'shipping' | 'total'>;
}

export function OrderSummary({ totals }: OrderSummaryProps) {
  const rows: Array<{ label: string; value: number; emphasize?: boolean; hidden?: boolean }> = [
    { label: 'Subtotal', value: totals.subtotal },
    { label: 'Discount', value: totals.discount ?? 0, hidden: (totals.discount ?? 0) <= 0 },
    { label: 'Tax (11%)', value: totals.tax },
    { label: 'Shipping', value: totals.shipping },
  ];

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Order Summary</h2>
        <p className="text-sm text-muted-foreground">
          Review the total cost before proceeding to payment.
        </p>
      </div>
      <dl className="space-y-2 text-sm">
        {rows
          .filter((row) => !row.hidden)
          .map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd>{formatCurrency(row.value)}</dd>
            </div>
          ))}
      </dl>
      <div className="flex items-center justify-between border-t pt-4 text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}
