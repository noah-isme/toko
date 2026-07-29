'use client';

import React from 'react';

import type { ShippingOption } from '@/entities/checkout/schemas';
import { formatCurrency } from '@/lib/api/utils';
import { cn } from '@/lib/utils';

export interface ShippingOptionsProps {
  options: ShippingOption[];
  selectedId?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ShippingOptions({ options, selectedId, onChange, disabled }: ShippingOptionsProps) {
  if (!options.length) {
    return <p className="text-sm text-muted-foreground">No shipping options available.</p>;
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        const etaLabel = formatEtaLabel(option.etd);
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
              <p className="text-sm font-semibold">{formatCurrency(option.cost)}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function formatEtaLabel(etd: string) {
  const parsed = parseEtdDays(etd);
  if (!parsed) {
    return `Estimasi tiba ${etd}`;
  }

  const { minDays, maxDays } = parsed;
  const now = new Date();
  const startDate = addDays(now, minDays);
  const endDate = addDays(now, maxDays);
  const formatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);
  const range = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;

  return `Estimasi tiba ${range}`;
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
