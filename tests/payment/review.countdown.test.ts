import { describe, expect, it } from 'vitest';

import { formatCountdown } from '@/app/(storefront)/checkout/review/_lib/countdown';
import {
  formatDraftAddressLines,
  getFallbackTotals,
} from '@/app/(storefront)/checkout/review/_lib/summary';

describe('formatCountdown', () => {
  it('formats milliseconds as zero-padded HH:MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(5_000)).toBe('00:00:05');
    expect(formatCountdown(65_000)).toBe('00:01:05');
    expect(formatCountdown(3_600_000 + 2 * 60_000 + 3_000)).toBe('01:02:03');
  });

  it('floors partial seconds', () => {
    expect(formatCountdown(1_999)).toBe('00:00:01');
  });

  it('clamps negative durations to zero', () => {
    expect(formatCountdown(-10_000)).toBe('00:00:00');
  });

  it('keeps counting hours past a day', () => {
    expect(formatCountdown(25 * 3_600_000)).toBe('25:00:00');
  });
});

describe('getFallbackTotals', () => {
  it('applies 11% tax on the cart subtotal', () => {
    expect(getFallbackTotals(100_000)).toEqual({
      subtotal: 100_000,
      discount: 0,
      shipping: 0,
      tax: 11_000,
      total: 111_000,
    });
  });

  it('treats a missing subtotal as zero', () => {
    expect(getFallbackTotals(undefined).total).toBe(0);
  });
});

describe('formatDraftAddressLines', () => {
  it('builds display lines and skips an empty country', () => {
    expect(
      formatDraftAddressLines({
        receiverName: 'Sari',
        phone: '0811',
        addressLine1: 'Jl. A',
        addressLine2: 'No. 2',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        country: '',
      }),
    ).toEqual(['Sari • 0811', 'Jl. A, No. 2', 'Bandung, Jawa Barat 40111']);
  });
});
