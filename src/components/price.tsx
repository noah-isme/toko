import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

interface PriceProps extends ComponentPropsWithoutRef<'span'> {
  amount: number;
  currency?: string;
  locale?: string;
}

export function Price({
  amount,
  currency = 'USD',
  locale = 'en-US',
  className,
  ...props
}: PriceProps) {
  // Pin the fraction digits: ICU data differs between Node and browsers (Node
  // renders IDR with 0 decimals, Chromium with 2), which breaks hydration of
  // server-rendered prices. IDR is shown without decimals across the app.
  const fractionDigits = currency === 'IDR' ? 0 : 2;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return (
    <span className={cn('font-semibold text-primary', className)} {...props}>
      {formatter.format(amount)}
    </span>
  );
}
