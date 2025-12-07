'use client';

import { useState } from 'react';

import { PAYMENT_METHOD_LABELS } from '@/lib/api/constants';
import type { PaymentMethod } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
  className?: string;
}

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'bank_transfer',
    label: PAYMENT_METHOD_LABELS.bank_transfer,
    description: 'Transfer manual ke rekening bank',
    icon: '🏦',
  },
  {
    value: 'virtual_account',
    label: PAYMENT_METHOD_LABELS.virtual_account,
    description: 'Bayar melalui Virtual Account',
    icon: '💳',
  },
  {
    value: 'credit_card',
    label: PAYMENT_METHOD_LABELS.credit_card,
    description: 'Pembayaran dengan kartu kredit',
    icon: '💳',
  },
  {
    value: 'ewallet_gopay',
    label: PAYMENT_METHOD_LABELS.ewallet_gopay,
    description: 'Bayar dengan GoPay',
    icon: '📱',
  },
  {
    value: 'ewallet_ovo',
    label: PAYMENT_METHOD_LABELS.ewallet_ovo,
    description: 'Bayar dengan OVO',
    icon: '📱',
  },
  {
    value: 'ewallet_dana',
    label: PAYMENT_METHOD_LABELS.ewallet_dana,
    description: 'Bayar dengan DANA',
    icon: '📱',
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('space-y-3', className)} role="radiogroup">
      {PAYMENT_METHODS.map((method) => {
        const isSelected = selectedMethod === method.value;
        return (
          <button
            key={method.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(method.value)}
            className={cn(
              'w-full text-left',
              'rounded-lg border p-4 transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/60',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {method.icon}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{method.label}</p>
                  {isSelected && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      Dipilih
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
