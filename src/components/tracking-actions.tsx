'use client';

import { Bell, BellOff, Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { useToast } from '@/shared/ui/toast';

const NOTIFY_PREF_PREFIX = 'toko:tracking-notify:';

interface TrackingActionsProps {
  orderId: string;
  trackingNumber: string;
  /** Absolute URL to this tracking page, used as the share target. */
  shareUrl: string;
}

type NotifyState = 'unsupported' | 'idle' | 'enabled' | 'denied';

function readNotifyPreference(orderId: string): boolean {
  try {
    return window.localStorage.getItem(`${NOTIFY_PREF_PREFIX}${orderId}`) === '1';
  } catch {
    return false;
  }
}

function writeNotifyPreference(orderId: string, enabled: boolean) {
  try {
    if (enabled) {
      window.localStorage.setItem(`${NOTIFY_PREF_PREFIX}${orderId}`, '1');
    } else {
      window.localStorage.removeItem(`${NOTIFY_PREF_PREFIX}${orderId}`);
    }
  } catch {
    // Non-fatal: preference simply won't persist across reloads.
  }
}

function resolveInitialNotifyState(orderId: string): NotifyState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  if (readNotifyPreference(orderId) && Notification.permission === 'granted') {
    return 'enabled';
  }

  return 'idle';
}

export function TrackingActions({ orderId, trackingNumber, shareUrl }: TrackingActionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [notify, setNotify] = useState<NotifyState>('idle');

  // Resolve initial notification state on mount. This reads client-only APIs
  // (Notification, localStorage), so it must run after hydration rather than
  // during render to keep server/client markup identical.
  useEffect(() => {
    setNotify(resolveInitialNotifyState(orderId));
  }, [orderId]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'Lacak Pengiriman',
      text: `Lacak pengiriman pesanan (resi ${trackingNumber})`,
      url: shareUrl,
    };

    capturePosthogEvent('shipment_tracking_shared', { orderId, trackingNumber });

    // Prefer the native share sheet where available (mobile), fall back to clipboard.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // AbortError means the user dismissed the sheet — do nothing further.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // Any other failure falls through to the clipboard path below.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({
        variant: 'success',
        title: 'Tautan disalin',
        description: 'Tautan pelacakan telah disalin ke clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Gagal menyalin tautan',
        description: 'Salin URL dari bilah alamat browser Anda.',
      });
    }
  }, [orderId, shareUrl, toast, trackingNumber]);

  const handleToggleNotify = useCallback(async () => {
    if (notify === 'enabled') {
      writeNotifyPreference(orderId, false);
      setNotify('idle');
      capturePosthogEvent('shipment_tracking_notify_disabled', { orderId });
      toast({
        title: 'Notifikasi dimatikan',
        description: 'Anda tidak akan menerima pembaruan pengiriman di perangkat ini.',
      });
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      writeNotifyPreference(orderId, true);
      setNotify('enabled');
      capturePosthogEvent('shipment_tracking_notify_enabled', { orderId });
      toast({
        variant: 'success',
        title: 'Notifikasi diaktifkan',
        description: 'Kami akan memberi tahu Anda saat status pengiriman berubah.',
      });
    } else {
      setNotify('denied');
      toast({
        variant: 'destructive',
        title: 'Izin notifikasi ditolak',
        description: 'Aktifkan notifikasi untuk situs ini di pengaturan browser Anda.',
      });
    }
  }, [notify, orderId, toast]);

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" onClick={handleShare}>
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        Bagikan tautan pelacakan
      </Button>

      {notify !== 'unsupported' ? (
        <Button
          type="button"
          variant={notify === 'enabled' ? 'default' : 'outline'}
          onClick={handleToggleNotify}
          disabled={notify === 'denied'}
          aria-pressed={notify === 'enabled'}
        >
          {notify === 'enabled' ? (
            <Bell className="h-4 w-4" aria-hidden="true" />
          ) : (
            <BellOff className="h-4 w-4" aria-hidden="true" />
          )}
          {notify === 'enabled' ? 'Notifikasi aktif' : 'Beritahu saya'}
        </Button>
      ) : null}
    </div>
  );
}
