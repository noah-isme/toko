import type { PaymentStatus } from './schemas';

type PaymentStatusValue = PaymentStatus['status'];

/** Statuses after which the payment can no longer change on its own; polling stops on these. */
export const TERMINAL_PAYMENT_STATUSES: readonly PaymentStatusValue[] = [
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
];

/**
 * Polling schedule for the payment status: fast while the customer is most likely completing the
 * payment, then backing off, and giving up after `maxDurationMs` (the UI then offers a manual
 * check instead).
 */
export const PAYMENT_POLL_SCHEDULE = {
  steps: [
    { untilMs: 60_000, intervalMs: 4_000 },
    { untilMs: 5 * 60_000, intervalMs: 10_000 },
  ],
  fallbackIntervalMs: 30_000,
  maxDurationMs: 15 * 60_000,
} as const;

export function isTerminalPaymentStatus(status: PaymentStatusValue | undefined | null): boolean {
  return Boolean(status && TERMINAL_PAYMENT_STATUSES.includes(status));
}

/**
 * Next refetch interval in ms for a payment that has been polled for `elapsedMs`, or `false` to
 * stop polling (terminal status or max duration reached).
 */
export function getPaymentPollInterval(
  status: PaymentStatusValue | undefined | null,
  elapsedMs: number,
): number | false {
  if (isTerminalPaymentStatus(status)) {
    return false;
  }

  if (elapsedMs >= PAYMENT_POLL_SCHEDULE.maxDurationMs) {
    return false;
  }

  const step = PAYMENT_POLL_SCHEDULE.steps.find((entry) => elapsedMs < entry.untilMs);
  return step ? step.intervalMs : PAYMENT_POLL_SCHEDULE.fallbackIntervalMs;
}
