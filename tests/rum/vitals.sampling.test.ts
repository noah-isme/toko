import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capturePosthogEvent = vi.fn();

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent,
  getPosthog: vi.fn(() => null),
}));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryMessage: vi.fn(),
  getSentryUser: vi.fn(() => undefined),
}));

describe('RUM sampling', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRandom = Math.random;
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'ph-key';
    process.env.NEXT_PUBLIC_RUM_DEST = 'posthog';
    process.env.NEXT_PUBLIC_RUM_SAMPLE = '0.1';
    capturePosthogEvent.mockClear();
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_RUM_DEST;
    delete process.env.NEXT_PUBLIC_RUM_SAMPLE;
    Math.random = originalRandom;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: originalSessionStorage,
    });

    const transportModule = await import('@/shared/rum/transport');
    transportModule.__resetRumInternalState();
  });

  it('uses Math.random fallback when deterministic ids are unavailable', async () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });

    const transportModule = await import('@/shared/rum/transport');

    Math.random = vi.fn(() => 0.05);
    transportModule.reportWebVital({ name: 'FCP', value: 1000, delta: 1000 } as never);
    expect(capturePosthogEvent).toHaveBeenCalledTimes(1);

    transportModule.__resetRumInternalState();
    capturePosthogEvent.mockClear();

    Math.random = vi.fn(() => 0.2);
    transportModule.reportWebVital({ name: 'INP', value: 120, delta: 120 } as never);
    expect(capturePosthogEvent).not.toHaveBeenCalled();
  });

  it('respects zero sample rate', async () => {
    process.env.NEXT_PUBLIC_RUM_SAMPLE = '0';

    const transportModule = await import('@/shared/rum/transport');

    transportModule.reportWebVital({ name: 'TTFB', value: 50, delta: 50 } as never);

    expect(capturePosthogEvent).not.toHaveBeenCalled();
  });
});
