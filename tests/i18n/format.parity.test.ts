import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate } from '@/shared/i18n/format';

/**
 * Frozen copies of the legacy `src/lib/api/utils.ts` helpers (removed once every caller moved to
 * the locale-aware formatters). They pin the `id` output the UI showed before the migration.
 */
function legacyFormatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function legacyFormatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

const AMOUNTS = [0, 1, 999, 1_000, 15_500, 250_000, 1_000_000, 12_345_678, 1_500.5, -75_000];

// Normalise the narrow/no-break spaces Intl puts between the currency and the number.
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ');

describe('shared i18n formatters', () => {
  it.each(AMOUNTS)('formatCurrency(%d, "id") matches the legacy helper exactly', (amount) => {
    expect(formatCurrency(amount, 'id')).toBe(legacyFormatCurrency(amount));
  });

  it('defaults to id and renders "Rp 1.000.000"', () => {
    expect(plain(formatCurrency(1_000_000))).toBe('Rp 1.000.000');
  });

  it('renders en as "IDR 1,000,000"', () => {
    expect(plain(formatCurrency(1_000_000, 'en'))).toBe('IDR 1,000,000');
    expect(plain(formatCurrency(15_500, 'en'))).toBe('IDR 15,500');
  });

  // Midday UTC is the same calendar day in Asia/Jakarta and in any CI time zone.
  it.each(['2026-01-05T05:00:00Z', '2026-08-17T05:00:00Z', '2026-12-31T05:00:00Z'])(
    'formatDate(%s, "id") matches the legacy helper',
    (iso) => {
      expect(formatDate(iso, 'id')).toBe(legacyFormatDate(iso));
    },
  );

  it('formats dates in Asia/Jakarta for both locales', () => {
    // 20:00 UTC is already the next day in Jakarta (UTC+7).
    expect(formatDate('2026-08-16T20:00:00Z', 'id')).toBe('17 Agustus 2026');
    expect(formatDate('2026-08-16T20:00:00Z', 'en')).toBe('August 17, 2026');
    expect(formatDate(new Date('2026-08-16T20:00:00Z'), 'id', 'short')).toBe('17 Agu 2026');
  });
});
