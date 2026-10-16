'use client';

import { useTranslations, type DateTimeFormatOptions } from 'next-intl';
import React from 'react';

import type { ShippingOption } from '@/entities/checkout/schemas';
import { cn } from '@/lib/utils';
import { useFormat, type StorefrontFormat } from '@/shared/i18n/use-format';

export interface ShippingOptionsProps {
  options: ShippingOption[];
  selectedId?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ShippingOptions({ options, selectedId, onChange, disabled }: ShippingOptionsProps) {
  const t = useTranslations('checkout.shipping');
  const fmt = useFormat();
  if (!options.length) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        const etaLabel = t('eta', { range: formatEtaRange(fmt, option.etd) });
        return (
          <label
            key={option.id}
            className={cn(
              'flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors',
              isSelected ? 'border-ring bg-muted' : 'border-border hover:border-ring',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name="shipping-option"
              value={option.id}
              className="sr-only"
              checked={isSelected}
              onChange={() => onChange(option.id)}
              disabled={disabled}
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {option.courier} - {option.service}
                </p>
                <span className="mt-1 inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {etaLabel}
                </span>
              </div>
              <p className="text-sm font-semibold">{fmt.currency(option.cost)}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

const ETA_DATE: DateTimeFormatOptions = { day: 'numeric', month: 'short' };

/** The arrival window shown after "Estimasi tiba": a date range, or the raw `etd` text. */
function formatEtaRange(fmt: StorefrontFormat, etd: string) {
  const parsed = parseEtdDays(etd);
  if (!parsed) {
    return etd;
  }

  const { minDays, maxDays } = parsed;
  const now = new Date();
  const startDate = addDays(now, minDays);
  const endDate = addDays(now, maxDays);
  const startLabel = fmt.date(startDate, ETA_DATE);
  const endLabel = fmt.date(endDate, ETA_DATE);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function parseEtdDays(etd: string) {
  const matches = etd.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const values = matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  const minDays = values[0];
  const maxDays = values.length > 1 ? values[1] : values[0];

  return {
    minDays: Math.max(0, Math.min(minDays, maxDays)),
    maxDays: Math.max(minDays, maxDays),
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
