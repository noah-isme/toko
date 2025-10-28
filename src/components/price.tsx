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
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  return (
    <span className={cn('font-semibold text-primary', className)} {...props}>
      {formatter.format(amount)}
    </span>
  );
}
