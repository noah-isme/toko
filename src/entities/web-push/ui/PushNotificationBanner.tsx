'use client';

import { Shield, Zap, Send, Loader2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { usePushPreferencesQuery, usePushSubscription } from '../hooks';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

interface PushBannerProps {
  className?: string;
}

export const PushNotificationBanner = memo(function PushNotificationBanner({ className }: PushBannerProps) {
  const { data: preferences, isLoading, refetch } = usePushPreferencesQuery();
  const { subscribe, unsubscribe, isSubscribing, isUnsubscribing } = usePushSubscription();
  const { toast } = useToast();
  const [localEnabled, setLocalEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissedBanner = localStorage.getItem('push-banner-dismissed');
    if (dismissedBanner === 'true') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (preferences && mounted) {
      setLocalEnabled(preferences.enabled);
    }
  }, [preferences, mounted]);

  const handleEnableChange = async (enabled: boolean) => {
    setLocalEnabled(enabled);
    
    if (enabled) {
      try {
        await subscribe();
        await refetch();
      } catch (error) {
        setLocalEnabled(false);
      }
    } else {
      try {
        await unsubscribe();
        await refetch();
      } catch (error) {
        setLocalEnabled(true);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push-banner-dismissed', 'true');
  };

  if (!mounted || isLoading || dismissed || (preferences && preferences.enabled)) {
    return null;
  }

  const isPending = isSubscribing || isUnsubscribing;

  return (
    <Card
      className={cn(
        'border-primary/20 bg-primary/5 relative overflow-hidden',
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-1 transition-colors hover:bg-muted"
        aria-label="Tutup"
      >
        <span className="text-muted-foreground">×</span>
      </button>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Aktifkan Notifikasi Push</CardTitle>
              <CardDescription className="text-sm">
                Terima update pesanan, promo flash sale, dan penurunan harga secara real-time
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <Switch
              checked={localEnabled}
              onCheckedChange={handleEnableChange}
              disabled={isPending}
              aria-label="Aktifkan notifikasi push"
            />
            <Button
              onClick={() => handleEnableChange(true)}
              disabled={isPending || localEnabled}
              size="sm"
              className="gap-1.5"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Aktifkan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PushNotificationBanner.displayName = 'PushNotificationBanner';