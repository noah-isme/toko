'use client';

import { TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { useDeleteAlertMutation, useProductAlertsQuery, useSubscribeAlertMutation } from '../hooks';
import { findAlert } from '../sellable';
import type { AlertSubscription } from '../types';

import { AlertLoginPrompt, currentReturnPath } from './AlertLoginPrompt';
import { alertErrorKind } from './messages';

import { useOptionalAuth } from '@/components/providers/AuthProvider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/shared/ui/toast';

/** Alert state supplied by a parent that already loaded the user's alerts. */
export interface PriceDropAlertState {
  /** The product-level PRICE_DROP subscription, if any. */
  alert: AlertSubscription | undefined;
  isLoading: boolean;
}

interface PriceDropToggleProps {
  productId: string;
  productName: string;
  /**
   * When given, the toggle uses it instead of fetching this product's alerts
   * itself. Lists of products (favorites) must pass it so they send one
   * `/alerts` request in total rather than one per product.
   */
  alertState?: PriceDropAlertState;
}

/** Product-level PRICE_DROP subscription as a labelled switch (favorites). */
export function PriceDropToggle({ productId, productName, alertState }: PriceDropToggleProps) {
  const t = useTranslations('product.alerts');
  const switchId = useId();
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const { toast } = useToast();
  const [loginOpen, setLoginOpen] = useState(false);
  const [returnTo, setReturnTo] = useState('/');

  const alertsQuery = useProductAlertsQuery(productId, {
    enabled: isAuthenticated && !alertState,
  });
  const subscribe = useSubscribeAlertMutation();
  const remove = useDeleteAlertMutation();

  const ownAlert = alertState ? alertState.alert : findAlert(alertsQuery.data, 'PRICE_DROP');
  const alertsLoading = alertState ? alertState.isLoading : alertsQuery.isLoading;
  const alert = isAuthenticated ? ownAlert : undefined;
  const isOn = alert?.status === 'active';
  const isBusy = subscribe.isPending || remove.isPending;

  const onError = (error: unknown) =>
    toast({ variant: 'destructive', description: t(`errors.${alertErrorKind(error)}`) });

  const handleChange = (checked: boolean) => {
    if (!isAuthenticated) {
      setReturnTo(currentReturnPath());
      setLoginOpen(true);
      return;
    }
    if (checked) {
      subscribe.mutate(
        { productId, type: 'PRICE_DROP' },
        {
          onSuccess: () => toast({ variant: 'success', description: t('priceDrop.enabled') }),
          onError,
        },
      );
    } else if (alert) {
      remove.mutate(alert.id, {
        onSuccess: () => toast({ variant: 'success', description: t('priceDrop.disabled') }),
        onError,
      });
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-3 py-2">
      <Label htmlFor={switchId} className="flex cursor-pointer items-center gap-2 text-sm">
        <TrendingDown className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>{t('priceDrop.label')}</span>
      </Label>
      <Switch
        id={switchId}
        aria-label={t('priceDrop.labelFor', { product: productName })}
        checked={isOn}
        onCheckedChange={handleChange}
        disabled={isBusy || (isAuthenticated && alertsLoading)}
        aria-busy={isBusy || undefined}
      />
      <AlertLoginPrompt open={loginOpen} onOpenChange={setLoginOpen} returnTo={returnTo} />
    </div>
  );
}
