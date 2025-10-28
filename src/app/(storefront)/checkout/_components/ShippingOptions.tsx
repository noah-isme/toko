'use client';

import React from 'react';

import type { ShippingOption } from '@/entities/checkout/schemas';
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
                <p className="text-xs text-muted-foreground">Est. {option.etd}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(option.cost)}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}
