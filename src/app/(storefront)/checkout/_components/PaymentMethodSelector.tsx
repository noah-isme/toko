'use client';

import { Banknote, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  icon: LucideIcon;
}> = [
  {
    value: 'bank_transfer',
    icon: Landmark,
  },
  {
    value: 'virtual_account',
    icon: Wallet,
  },
  {
    value: 'credit_card',
    icon: CreditCard,
  },
  {
    value: 'ewallet_gopay',
    icon: Smartphone,
  },
  {
    value: 'ewallet_ovo',
    icon: Smartphone,
  },
  {
    value: 'ewallet_dana',
    icon: Smartphone,
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('checkout.payment');
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
              <method.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">
                    {t(`methods.${method.value}.label`)}
                  </p>
                  {isSelected && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {t('selected')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`methods.${method.value}.description`)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
