import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const capturePosthogEvent = vi.fn();
const getPosthog = vi.fn(() => ({
  get_distinct_id: () => 'ph-user-id',
}));

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent,
  getPosthog,
}));

const captureSentryMessage = vi.fn();
const getSentryUser = vi.fn(() => ({ id: 'sentry-user-id' }));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryMessage,
  getSentryUser,
}));

describe('reportWebVital transport', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'ph-key';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'sentry-dsn';
    process.env.NEXT_PUBLIC_RUM_DEST = 'both';
    process.env.NEXT_PUBLIC_RUM_SAMPLE = '1';

    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/product?ref=dev');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
      writable: true,
    });

    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: {
        effectiveType: '4g',
        downlink: 12,
        rtt: 45,
        saveData: false,
      },
    });

    Object.defineProperty(window.navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });

    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 12,
    });

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(async () => {
    const transportModule = await import('@/shared/rum/transport');
    transportModule.__resetRumInternalState();

    vi.resetAllMocks();
    process.env.NODE_ENV = originalEnv;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_RUM_DEST;
    delete process.env.NEXT_PUBLIC_RUM_SAMPLE;
  });

  it('enriches payload and forwards to PostHog and Sentry', async () => {
    const transportModule = await import('@/shared/rum/transport');
    const payloads: unknown[] = [];

    transportModule.subscribeToRumMetrics((payload) => {
      payloads.push(payload);
    });

    const metric = {
      name: 'LCP',
      value: 2500,
      delta: 2500,
      rating: 'good',
      navigationType: 'navigate',
    } as const;

    transportModule.reportWebVital(metric);

    expect(payloads).toHaveLength(1);
    const payload = payloads[0] as transportModule.RumMetricPayload;

    expect(payload.metric).toBe('LCP');
    expect(payload.value).toBe(2500);
    expect(payload.rating).toBe('good');
    expect(payload.navigationType).toBe('navigate');
    expect(payload.url).toBe('http://localhost:3000/product?ref=dev');
    expect(payload.pathname).toBe('/product');
    expect(payload.viewport).toEqual({ width: 1440, height: 900 });
    expect(payload.deviceHints).toMatchObject({
      deviceMemory: 8,
      hardwareConcurrency: 12,
      prefersReducedMotion: false,
    });
    expect(payload.networkInfo).toMatchObject({
      effectiveType: '4g',
      downlink: 12,
      rtt: 45,
      saveData: false,
    });
    expect(payload.sessionId).toBeDefined();
    expect(payload.userId).toBe('ph-user-id');

    expect(capturePosthogEvent).toHaveBeenCalledWith('web_vital', payload);
    expect(captureSentryMessage).toHaveBeenCalledWith('web_vital', {
      level: 'info',
      extra: payload,
    });
  });

  it('skips transport in test environments', async () => {
    process.env.NODE_ENV = 'test';

    const transportModule = await import('@/shared/rum/transport');

    transportModule.reportWebVital({
      name: 'CLS',
      value: 0.03,
      delta: 0.03,
    } as never);

    expect(capturePosthogEvent).not.toHaveBeenCalled();
    expect(captureSentryMessage).not.toHaveBeenCalled();
  });
});
