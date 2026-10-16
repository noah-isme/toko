import { useFormatter } from 'next-intl';
import type { ComponentPropsWithoutRef } from 'react';

import { FORMATS } from '@/i18n/formats';
import { cn } from '@/lib/utils';

interface PriceProps extends ComponentPropsWithoutRef<'span'> {
  amount: number;
  /** ISO currency code; defaults to IDR. The locale comes from next-intl (`Rp 1.000` / `IDR 1,000`). */
  currency?: string;
}

export function Price({
  amount,
  currency = FORMATS.number.currency.currency,
  className,
  ...props
}: PriceProps) {
  const format = useFormatter();
  // Pin the fraction digits: ICU data differs between Node and browsers (Node
  // renders IDR with 0 decimals, Chromium with 2), which breaks hydration of
  // server-rendered prices. IDR is shown without decimals across the app.
  const fractionDigits = currency === 'IDR' ? 0 : 2;
  return (
    <span className={cn('font-semibold text-primary', className)} {...props}>
      {format.number(amount, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })}
    </span>
  );
}
