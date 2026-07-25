import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrackingActions } from '@/components/tracking-actions';

const mockToast = vi.fn();

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}));

const mockCapture = vi.fn();
vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent: (...args: unknown[]) => mockCapture(...args),
}));

const PROPS = {
  orderId: 'order-123',
  trackingNumber: 'TRACK999',
  shareUrl: 'https://toko.example/order/tracking/order-123',
};

function setNotification(
  permission: NotificationPermission | null,
  requestResult?: NotificationPermission,
) {
  if (permission === null) {
    // Simulate a browser without the Notification API.
    // @ts-expect-error deliberately removing for the unsupported case
    delete globalThis.Notification;
    return;
  }

  const requestPermission = vi.fn().mockResolvedValue(requestResult ?? permission);
  // @ts-expect-error partial Notification mock is sufficient for these tests
  globalThis.Notification = { permission, requestPermission };
}

beforeEach(() => {
  mockToast.mockClear();
  mockCapture.mockClear();
  window.localStorage.clear();
  setNotification('default');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrackingActions — share', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });

    render(<TrackingActions {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /bagikan tautan pelacakan/i }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: PROPS.shareUrl }));
    expect(mockCapture).toHaveBeenCalledWith(
      'shipment_tracking_shared',
      expect.objectContaining({ orderId: PROPS.orderId }),
    );
  });

  it('falls back to clipboard when native share is unavailable', async () => {
    // @ts-expect-error force the clipboard path
    delete navigator.share;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TrackingActions {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /bagikan tautan pelacakan/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(PROPS.shareUrl));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: 'Tautan disalin' }),
      ),
    );
  });

  it('surfaces an error toast when clipboard write fails', async () => {
    // @ts-expect-error force the clipboard path
    delete navigator.share;
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TrackingActions {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /bagikan tautan pelacakan/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
  });
});

describe('TrackingActions — notify', () => {
  it('hides the notify button when the Notification API is unsupported', () => {
    setNotification(null);
    render(<TrackingActions {...PROPS} />);
    expect(screen.queryByRole('button', { name: /beritahu saya|notifikasi aktif/i })).toBeNull();
  });

  it('requests permission and enables notifications when granted', async () => {
    setNotification('default', 'granted');
    render(<TrackingActions {...PROPS} />);

    const button = await screen.findByRole('button', { name: /beritahu saya/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notifikasi aktif/i })).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem('toko:tracking-notify:order-123')).toBe('1');
    expect(mockCapture).toHaveBeenCalledWith('shipment_tracking_notify_enabled', {
      orderId: PROPS.orderId,
    });
  });

  it('shows an error toast when permission is denied', async () => {
    setNotification('default', 'denied');
    render(<TrackingActions {...PROPS} />);

    fireEvent.click(await screen.findByRole('button', { name: /beritahu saya/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(window.localStorage.getItem('toko:tracking-notify:order-123')).toBeNull();
  });

  it('restores the enabled state from a saved preference', async () => {
    window.localStorage.setItem('toko:tracking-notify:order-123', '1');
    setNotification('granted');

    render(<TrackingActions {...PROPS} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notifikasi aktif/i })).toBeInTheDocument(),
    );
  });

  it('disables notifications when toggled off', async () => {
    window.localStorage.setItem('toko:tracking-notify:order-123', '1');
    setNotification('granted');

    render(<TrackingActions {...PROPS} />);
    const button = await screen.findByRole('button', { name: /notifikasi aktif/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /beritahu saya/i })).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem('toko:tracking-notify:order-123')).toBeNull();
    expect(mockCapture).toHaveBeenCalledWith('shipment_tracking_notify_disabled', {
      orderId: PROPS.orderId,
    });
  });
});
