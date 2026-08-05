'use client';

import { Bell, BellOff, Check, Loader2, Send, Shield, Zap } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { usePushPreferencesQuery, usePushSubscription, useUpdatePushPreferencesMutation, useSendTestPushMutation } from '../hooks';
import type { PushNotificationType } from '../types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

interface PushPreferencesCardProps {
  className?: string;
}

export const PushPreferencesCard = memo(function PushPreferencesCard({ className }: PushPreferencesCardProps) {
  const { data: preferences, isLoading, refetch } = usePushPreferencesQuery();
  const updatePreferences = useUpdatePushPreferencesMutation();
  const { subscribe, unsubscribe, isSubscribing, isUnsubscribing } = usePushSubscription();
  const { mutate: sendTest, isPending: isSendingTest } = useSendTestPushMutation();
  const { toast } = useToast();
  const [localEnabled, setLocalEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        console.error('Failed to subscribe:', error);
      }
    } else {
      try {
        await unsubscribe();
        await refetch();
      } catch (error) {
        setLocalEnabled(true);
        console.error('Failed to unsubscribe:', error);
      }
    }
  };

  const handleTypeChange = async (type: string, enabled: boolean) => {
    if (!preferences) return;
    
    const newTypes = { ...preferences.types, [type]: enabled };
    await updatePreferences.mutateAsync({ types: newTypes });
  };

  if (!mounted) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="space-y-4" aria-busy="true">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-11 animate-pulse rounded bg-muted" />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-11 animate-pulse rounded bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="space-y-4" aria-busy="true">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-11 animate-pulse rounded bg-muted" />
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-11 animate-pulse rounded bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    { key: 'order_update', label: 'Pembaruan Pesanan', description: 'Status pengiriman, pengiriman, dll.', icon: Shield },
    { key: 'price_drop', label: 'Penurunan Harga', description: 'Produk favorit Anda murah.', icon: Zap },
    { key: 'flash_sale', label: 'Flash Sale', description: 'Promo terbatas dan event spesial.', icon: Zap },
    { key: 'new_review', label: 'Ulasan Baru', description: 'Ulasan pada produk yang Anda beli.', icon: Send },
    { key: 'qa_answered', label: 'Pertanyaan Dijawab', description: 'Jawaban pertanyaan produk Anda.', icon: Shield },
    { key: 'loyalty_reward', label: 'Hadiah Loyalitas', description: 'Poin dan hadiah tersedia.', icon: Shield },
    { key: 'general', label: 'Umum', description: 'Pengumuman dan berita penting.', icon: Bell },
  ];

  const isPending = isSubscribing || isUnsubscribing || updatePreferences.isPending;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              Notifikasi Push
            </CardTitle>
            <CardDescription>
              Terima notifikasi real-time tanpa perlu membuka aplikasi
            </CardDescription>
          </div>
          <Switch
            checked={localEnabled}
            onCheckedChange={handleEnableChange}
            disabled={isPending}
            aria-label="Aktifkan notifikasi push"
          />
        </div>
      </CardHeader>
      <CardContent>
        {preferences && (
          <>
            <Separator className="my-4" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notificationTypes.map(({ key, label, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`push-${key}`} className="mb-0 cursor-pointer font-medium">
                        {label}
                      </Label>
                      <Switch
                        id={`push-${key}`}
                        checked={preferences.types[key as PushNotificationType] ?? false}
                        onCheckedChange={(checked) => handleTypeChange(key, checked)}
                        disabled={!localEnabled || isPending}
                        aria-label={`Aktifkan notifikasi ${label}`}
                      />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {preferences.endpoint ? 'Terdaftar' : 'Belum terdaftar'}
                </p>
              </div>
              {preferences.endpoint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTest()}
                  disabled={isSendingTest || isPending}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Tes'}
                </Button>
              )}
            </div>

            {preferences.endpoint && (
              <p className="mt-2 text-xs text-muted-foreground">
                Endpoint: {preferences.endpoint.substring(0, 50)}...
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

PushPreferencesCard.displayName = 'PushPreferencesCard';