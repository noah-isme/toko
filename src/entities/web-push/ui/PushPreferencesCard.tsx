'use client';

import { Bell, BellOff, Check, Loader2, Send, Shield, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useEffect, useState } from 'react';

import {
  usePushPreferencesQuery,
  usePushSubscription,
  useUpdatePushPreferencesMutation,
  useSendTestPushMutation,
} from '../hooks';
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

export const PushPreferencesCard = memo(function PushPreferencesCard({
  className,
}: PushPreferencesCardProps) {
  const t = useTranslations('account.push');
  const { data: preferences, isLoading, refetch } = usePushPreferencesQuery();
  const updatePreferences = useUpdatePushPreferencesMutation();
  const { subscribe, unsubscribe, isSubscribing, isUnsubscribing } = usePushSubscription();
  const { mutate: sendTest, isPending: isSendingTest } = useSendTestPushMutation();
  const { toast } = useToast();
  // Optimistic value while (un)subscribing; otherwise derived from the server preferences.
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const localEnabled = pendingEnabled ?? preferences?.enabled ?? false;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnableChange = async (enabled: boolean) => {
    setPendingEnabled(enabled);

    if (enabled) {
      try {
        await subscribe();
        await refetch();
      } catch (error) {
        console.error('Failed to subscribe:', error);
      } finally {
        setPendingEnabled(null);
      }
    } else {
      try {
        await unsubscribe();
        await refetch();
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
      } finally {
        setPendingEnabled(null);
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
    { key: 'order_update', icon: Shield },
    { key: 'price_drop', icon: Zap },
    { key: 'flash_sale', icon: Zap },
    { key: 'new_review', icon: Send },
    { key: 'qa_answered', icon: Shield },
    { key: 'loyalty_reward', icon: Shield },
    { key: 'general', icon: Bell },
  ] as const;

  const isPending = isSubscribing || isUnsubscribing || updatePreferences.isPending;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('settingsDescription')}</CardDescription>
          </div>
          <Switch
            checked={localEnabled}
            onCheckedChange={handleEnableChange}
            disabled={isPending}
            aria-label={t('card.enableLabel')}
          />
        </div>
      </CardHeader>
      <CardContent>
        {preferences && (
          <>
            <Separator className="my-4" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notificationTypes.map(({ key, icon: Icon }) => (
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
                        {t(`card.types.${key}.label`)}
                      </Label>
                      <Switch
                        id={`push-${key}`}
                        checked={preferences.types[key as PushNotificationType] ?? false}
                        onCheckedChange={(checked) => handleTypeChange(key, checked)}
                        disabled={!localEnabled || isPending}
                        aria-label={t('card.enableType', { label: t(`card.types.${key}.label`) })}
                      />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t(`card.types.${key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('card.status')}</p>
                <p className="text-sm text-muted-foreground">
                  {preferences.endpoint ? t('card.registered') : t('card.notRegistered')}
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
                  {isSendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('card.sendTest')
                  )}
                </Button>
              )}
            </div>

            {preferences.endpoint && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('card.endpoint', { endpoint: preferences.endpoint.substring(0, 50) })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

PushPreferencesCard.displayName = 'PushPreferencesCard';
