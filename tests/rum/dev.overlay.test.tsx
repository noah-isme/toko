import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const capturePosthogEvent = vi.fn();

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent,
  getPosthog: vi.fn(() => ({ get_distinct_id: () => undefined })),
}));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryMessage: vi.fn(),
  getSentryUser: vi.fn(() => undefined),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('vitals=1'),
}));

describe('DevVitalsOverlay', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_RUM_DEST = 'none';
    process.env.NEXT_PUBLIC_RUM_SAMPLE = '1';
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.NEXT_PUBLIC_RUM_DEST;
    delete process.env.NEXT_PUBLIC_RUM_SAMPLE;
    const transportModule = await import('@/shared/rum/transport');
    transportModule.__resetRumInternalState();
  });

  it('renders metrics when enabled via query param', async () => {
    const { DevVitalsOverlay } = await import('@/shared/rum/DevVitalsOverlay');
    const transportModule = await import('@/shared/rum/transport');

    render(<DevVitalsOverlay />);

    transportModule.reportWebVital({
      name: 'CLS',
      value: 0.045,
      delta: 0.02,
      rating: 'needs-improvement',
    } as never);

    await waitFor(() => {
      expect(screen.getByText(/CLS/i)).toBeInTheDocument();
      expect(screen.getByText('0.045')).toBeInTheDocument();
    });

    expect(capturePosthogEvent).not.toHaveBeenCalled();
  });
});
