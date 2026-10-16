import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { TEST_MESSAGES } from '../utils/next-intl-mock';

import type { Locale } from '@/i18n/config';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';
import {
  FULL_DATE_TIME,
  NUMERIC_DATE,
  PADDED_SHORT_DATE,
  useFormat,
} from '@/shared/i18n/use-format';

const plain = (value: string) => value.replace(/[  ]/g, ' ');

function renderFormat(locale?: Locale) {
  if (!locale) return renderHook(() => useFormat()).result.current;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider
      locale={locale}
      messages={TEST_MESSAGES[locale]}
      timeZone={TIME_ZONE}
      formats={FORMATS}
    >
      {children}
    </NextIntlClientProvider>
  );
  return renderHook(() => useFormat(), { wrapper }).result.current;
}

/** The ad-hoc `id-ID` calls the storefront used before, pinned to the WIB time zone. */
const legacy = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('id-ID', { ...options, timeZone: TIME_ZONE }).format(new Date(value));

const NOW = new Date('2026-10-12T10:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MINUTE = 60_000;

describe('useFormat (storefront)', () => {
  describe.each([undefined, 'id'] as const)('id output (provider: %s)', (locale) => {
    const fmt = renderFormat(locale);

    it('renders currency exactly like the legacy id-ID helper', () => {
      expect(plain(fmt.currency(1_000_000))).toBe('Rp 1.000.000');
      expect(fmt.currency(15_500)).toBe(
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(15_500),
      );
    });

    it('renders dates exactly like the legacy id-ID calls', () => {
      const iso = '2026-08-17T07:05:09Z';
      expect(fmt.date(iso)).toBe('17 Agustus 2026');
      expect(fmt.dateTime(iso)).toBe(
        legacy(iso, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
      expect(fmt.date(iso, FULL_DATE_TIME)).toBe(
        new Date(iso).toLocaleString('id-ID', { timeZone: TIME_ZONE }),
      );
      expect(fmt.date(iso, NUMERIC_DATE)).toBe(
        new Date(iso).toLocaleDateString('id-ID', { timeZone: TIME_ZONE }),
      );
      expect(fmt.date(iso, PADDED_SHORT_DATE)).toBe(legacy(iso, PADDED_SHORT_DATE));
      expect(fmt.time(iso)).toBe('14.05');
      expect(fmt.number(1_250)).toBe('1.250');
    });

    it('keeps the relative-time wording', () => {
      expect(fmt.relative(ago(10_000), NOW)).toBe('baru saja');
      expect(fmt.relative(ago(MINUTE), NOW)).toBe('1 menit yang lalu');
      expect(fmt.relative(ago(5 * MINUTE), NOW)).toBe('5 menit yang lalu');
      expect(fmt.relative(ago(3 * 60 * MINUTE), NOW)).toBe('3 jam yang lalu');
      expect(fmt.relative(ago(2 * 24 * 60 * MINUTE), NOW)).toBe('2 hari yang lalu');
      expect(fmt.relative(ago(10 * 24 * 60 * MINUTE), NOW)).toBe('02 Okt 2026');
    });

    it('renders unparseable dates as the raw input', () => {
      expect(fmt.date('not a date')).toBe('not a date');
      expect(fmt.relative('not a date', NOW)).toBe('not a date');
    });
  });

  describe('en output', () => {
    const fmt = renderFormat('en');

    it('renders currency as IDR with en grouping', () => {
      expect(plain(fmt.currency(1_000_000))).toBe('IDR 1,000,000');
      expect(fmt.number(1_250)).toBe('1,250');
    });

    it('renders dates in en, in Asia/Jakarta', () => {
      // 20:00 UTC is already the next day in Jakarta.
      expect(fmt.date('2026-08-16T20:00:00Z')).toBe('August 17, 2026');
      expect(fmt.date('2026-08-16T20:00:00Z', PADDED_SHORT_DATE)).toBe('Aug 17, 2026');
      expect(plain(fmt.time('2026-08-17T07:05:00Z'))).toBe('02:05 PM');
    });

    it('renders relative times in English with plurals', () => {
      expect(fmt.relative(ago(10_000), NOW)).toBe('just now');
      expect(fmt.relative(ago(MINUTE), NOW)).toBe('1 minute ago');
      expect(fmt.relative(ago(5 * MINUTE), NOW)).toBe('5 minutes ago');
      expect(fmt.relative(ago(60 * MINUTE), NOW)).toBe('1 hour ago');
      expect(fmt.relative(ago(2 * 24 * 60 * MINUTE), NOW)).toBe('2 days ago');
    });
  });
});
