'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { Totals } from '@/entities/checkout/schemas';
import { useFormat } from '@/shared/i18n/use-format';

export interface OrderSummaryProps {
  totals: Pick<Totals, 'subtotal' | 'discount' | 'tax' | 'shipping' | 'total'>;
}

export function OrderSummary({ totals }: OrderSummaryProps) {
  const t = useTranslations('checkout.summary');
  const fmt = useFormat();
  const taxRate = taxRateLabel(totals.subtotal, totals.discount ?? 0, totals.tax);
  const rows: Array<{
    id: string;
    label: string;
    value: number;
    emphasize?: boolean;
    hidden?: boolean;
  }> = [
    { id: 'subtotal', label: t('subtotal'), value: totals.subtotal },
    {
      id: 'discount',
      label: t('discount'),
      value: totals.discount ?? 0,
      hidden: (totals.discount ?? 0) <= 0,
    },
    {
      id: 'tax',
      label: taxRate === null ? t('tax') : t('taxRate', { rate: taxRate }),
      value: totals.tax,
    },
    { id: 'shipping', label: t('shipping'), value: totals.shipping },
  ];

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <dl className="space-y-2 text-sm">
        {rows
          .filter((row) => !row.hidden)
          .map((row) => (
            <div key={row.id} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd>{fmt.currency(row.value)}</dd>
            </div>
          ))}
      </dl>
      <div className="flex items-center justify-between border-t pt-4 text-base font-semibold">
        <span>{t('total')}</span>
        <span>{fmt.currency(totals.total)}</span>
      </div>
    </div>
  );
}

// Derives the effective tax rate from the amounts the server sent, so the label
// stays honest if the backend rate (PRICING_TAX_RATE_BPS) ever changes. Returns null
// (plain "Tax" label) when the taxable base is zero (rate can't be inferred). The rate is
// passed to the catalog as a string so it keeps its "12.5" form in every locale.
function taxRateLabel(subtotal: number, discount: number, tax: number): string | null {
  const taxable = Math.max(0, subtotal - discount);
  if (taxable <= 0 || tax <= 0) {
    return null;
  }
  const percent = (tax / taxable) * 100;
  const rounded = Math.round(percent * 10) / 10;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return display;
}
