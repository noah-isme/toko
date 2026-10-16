import { useFormatter, useTranslations } from 'next-intl';

import { FORMATS } from '@/i18n/formats';

const MINUTE_MS = 60_000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;

/**
 * Locale-aware currency and date formatting for admin pages, on next-intl's `useFormatter()`
 * with the shared named formats (`src/i18n/formats.ts`): `Rp 1.500.000` / `IDR 1,500,000`.
 */
export function useAdminFormat() {
  const format = useFormatter();
  const t = useTranslations('admin.time');

  const currency = (amount: number, code: string = FORMATS.number.currency.currency) =>
    code === FORMATS.number.currency.currency
      ? format.number(amount, 'currency')
      : format.number(amount, { ...FORMATS.number.currency, currency: code });

  /** Compact numeric date and time, e.g. `12/10/2026, 17.00`. */
  const date = (value: string | number | Date) =>
    format.dateTime(value instanceof Date ? value : new Date(value), 'numeric');

  /** Numeric date only, e.g. `12/10/2026`. */
  const day = (value: string | number | Date) =>
    format.dateTime(value instanceof Date ? value : new Date(value), {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

  /** "Just now", then "5 minutes ago" up to a week, then the compact date. */
  const relative = (value: string | number | Date, now: Date = new Date()) => {
    const at = value instanceof Date ? value : new Date(value);
    const diff = now.getTime() - at.getTime();
    if (diff < MINUTE_MS) return t('justNow');
    if (diff < WEEK_MS) return format.relativeTime(at, now);
    return date(at);
  };

  return { format, currency, date, day, relative };
}
