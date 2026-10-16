import { useFormatter, useTranslations, type DateTimeFormatOptions } from 'next-intl';
import { useMemo } from 'react';

import { FORMATS } from '@/i18n/formats';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export type DateInput = string | number | Date;
type NamedDateFormat = keyof typeof FORMATS.dateTime;

/** `05 Jan 2026` / `Jan 05, 2026`: reviews, Q&A and relative-time fallback. */
export const PADDED_SHORT_DATE: DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

/** What `Date#toLocaleString()` shows: `12/10/2026, 17.00.00` / `10/12/2026, 5:00:00 PM`. */
export const FULL_DATE_TIME: DateTimeFormatOptions = {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

/** What `Date#toLocaleDateString()` shows: `12/10/2026` / `10/12/2026`. */
export const NUMERIC_DATE: DateTimeFormatOptions = {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
};

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Locale-aware formatting for storefront components, on next-intl's `useFormatter()` with the
 * shared named formats (`src/i18n/formats.ts`) and the `Asia/Jakarta` time zone, so server and
 * client renders match. In `id` every helper renders exactly what the legacy `id-ID` helpers did
 * (`Rp 1.000.000`, `17 Agustus 2026`, `5 menit yang lalu`); in `en` it renders `IDR 1,000,000`,
 * `August 17, 2026`, `5 minutes ago`.
 *
 * Unparseable dates render the raw input instead of throwing. The returned object is stable for a
 * given locale, so it is safe in hook dependency lists.
 */
export function useFormat() {
  const format = useFormatter();
  const t = useTranslations('common.time');
  return useMemo(() => createStorefrontFormat(format, t), [format, t]);
}

function createStorefrontFormat(
  format: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations<'common.time'>>,
) {
  const currency = (amount: number, code: string = FORMATS.number.currency.currency) =>
    code === FORMATS.number.currency.currency
      ? format.number(amount, 'currency')
      : format.number(amount, { ...FORMATS.number.currency, currency: code });

  /** Plain grouped number, e.g. points: `1.250` / `1,250`. */
  const number = (value: number) => format.number(value);

  /** A date in a named format (default `long`: `17 Agustus 2026`) or with explicit options. */
  const date = (value: DateInput, style: NamedDateFormat | DateTimeFormatOptions = 'long') => {
    const at = toDate(value);
    if (!at) return String(value);
    return typeof style === 'string' ? format.dateTime(at, style) : format.dateTime(at, style);
  };

  /** Time of day: `14.30` / `02:30 PM`. */
  const time = (value: DateInput) => date(value, { hour: '2-digit', minute: '2-digit' });

  /** Long date with time: `17 Agustus 2026 pukul 14.30` / `August 17, 2026 at 02:30 PM`. */
  const dateTime = (value: DateInput) => date(value, 'dateTime');

  /**
   * "baru saja", then "5 menit yang lalu" / "3 jam yang lalu" / "2 hari yang lalu" up to a week,
   * then the padded short date (`05 Jan 2026`).
   */
  const relative = (value: DateInput, now: Date = new Date()) => {
    const at = toDate(value);
    if (!at) return String(value);
    const diff = now.getTime() - at.getTime();
    if (diff < MINUTE_MS) return t('justNow');
    if (diff < HOUR_MS) return t('minutesAgo', { count: Math.floor(diff / MINUTE_MS) });
    if (diff < DAY_MS) return t('hoursAgo', { count: Math.floor(diff / HOUR_MS) });
    if (diff < WEEK_MS) return t('daysAgo', { count: Math.floor(diff / DAY_MS) });
    return format.dateTime(at, PADDED_SHORT_DATE);
  };

  return { format, currency, number, date, dateTime, time, relative };
}

export type StorefrontFormat = ReturnType<typeof createStorefrontFormat>;
