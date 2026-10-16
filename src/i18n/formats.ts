import type { Formats } from 'next-intl';

/** Every date and time is shown in the storefront's market time zone (WIB). */
export const TIME_ZONE = 'Asia/Jakarta';

/**
 * Named formats shared by `src/i18n/request.ts` (next-intl), the Vitest `next-intl` mock and the
 * plain helpers in `src/shared/i18n/format.ts`, so all three render identical output.
 */
export const FORMATS = {
  number: {
    currency: {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  dateTime: {
    short: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    long: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
    dateTime: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    /** Compact all-numeric date and time for dense tables (admin): `12/10/2026, 17.00`. */
    numeric: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  },
} satisfies Formats;
