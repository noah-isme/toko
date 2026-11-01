import { describe, expect, it } from 'vitest';

import {
  getPaymentPollInterval,
  isTerminalPaymentStatus,
  PAYMENT_POLL_SCHEDULE,
} from '@/entities/payment/polling';

describe('getPaymentPollInterval', () => {
  it('polls every 4s during the first minute', () => {
    expect(getPaymentPollInterval('PENDING', 0)).toBe(4_000);
    expect(getPaymentPollInterval(undefined, 59_999)).toBe(4_000);
  });

  it('backs off to 10s and then 30s', () => {
    expect(getPaymentPollInterval('PENDING', 60_000)).toBe(10_000);
    expect(getPaymentPollInterval('PENDING', 5 * 60_000 - 1)).toBe(10_000);
    expect(getPaymentPollInterval('PENDING', 5 * 60_000)).toBe(30_000);
    expect(getPaymentPollInterval('PENDING', 14 * 60_000)).toBe(30_000);
  });

  it('stops after the max duration', () => {
    expect(getPaymentPollInterval('PENDING', PAYMENT_POLL_SCHEDULE.maxDurationMs)).toBe(false);
  });

  it.each(['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'] as const)('stops on terminal %s', (status) => {
    expect(isTerminalPaymentStatus(status)).toBe(true);
    expect(getPaymentPollInterval(status, 0)).toBe(false);
  });

  it('keeps polling while pending', () => {
    expect(isTerminalPaymentStatus('PENDING')).toBe(false);
  });
});
