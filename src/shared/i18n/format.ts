import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';

/**
 * Locale-aware formatting for code that cannot use `useFormatter()`/`getFormatter()`
 * (plain functions, stores, non-React modules). Options come from `src/i18n/formats.ts`,
 * the same named formats next-intl uses, so output matches the hooks.
 *
 * - `id`: `Rp 1.000.000` (identical to the legacy `src/lib/api/utils.ts` helpers)
 * - `en`: `IDR 1,000,000`
 */

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

export type DateFormatName = keyof typeof FORMATS.dateTime;

export function formatCurrency(
  amount: number,
  locale: Locale = DEFAULT_LOCALE,
  currency: string = FORMATS.number.currency.currency,
): string {
  const cacheKey = `${locale}:${currency}`;
  let formatter = numberFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { ...FORMATS.number.currency, currency });
    numberFormatCache.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}

export function formatDate(
  date: string | number | Date,
  locale: Locale = DEFAULT_LOCALE,
  format: DateFormatName = 'long',
): string {
  const cacheKey = `${locale}:${format}`;
  let formatter = dateFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      ...FORMATS.dateTime[format],
      timeZone: TIME_ZONE,
    });
    dateFormatCache.set(cacheKey, formatter);
  }
  return formatter.format(date instanceof Date ? date : new Date(date));
}
