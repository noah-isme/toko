'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useDeleteAlertMutation, useProductAlertsQuery, useSubscribeAlertMutation } from '../hooks';
import { findAlert } from '../sellable';

import { AlertLoginPrompt, currentReturnPath } from './AlertLoginPrompt';
import { alertErrorKind } from './messages';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { catalogKeys } from '@/entities/catalog/keys';
import { useToast } from '@/shared/ui/toast';

interface BackInStockAlertProps {
  productId: string;
  productSlug: string;
  /** The sold-out variant, or null for a product without variants. */
  variantId: string | null;
}

/**
 * "Notify me when available" for a target that is not sellable. Render it only
 * when `isTargetSellable` is false: the backend refuses BACK_IN_STOCK with 409
 * ALREADY_IN_STOCK otherwise.
 */
export function BackInStockAlert({ productId, productSlug, variantId }: BackInStockAlertProps) {
  const t = useTranslations('product.alerts');
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loginOpen, setLoginOpen] = useState(false);
  const [returnTo, setReturnTo] = useState('/');

  const alertsQuery = useProductAlertsQuery(productId, { enabled: isAuthenticated });
  const subscribe = useSubscribeAlertMutation();
  const remove = useDeleteAlertMutation();

  const alert = isAuthenticated
    ? findAlert(alertsQuery.data, 'BACK_IN_STOCK', variantId)
    : undefined;
  const isActive = alert?.status === 'active';
  const isBusy = subscribe.isPending || remove.isPending;

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      setReturnTo(currentReturnPath());
      setLoginOpen(true);
      return;
    }
    subscribe.mutate(
      { productId, variantId, type: 'BACK_IN_STOCK' },
      {
        onSuccess: () =>
          toast({
            variant: 'success',
            title: t('backInStock.subscribedTitle'),
            description: t('backInStock.subscribedDescription'),
          }),
        onError: (error) => {
          const kind = alertErrorKind(error);
          // The target became sellable meanwhile: refresh stock so "Add to cart" returns.
          if (kind === 'alreadyInStock') {
            void queryClient.invalidateQueries({ queryKey: catalogKeys.product(productSlug) });
          }
          toast({ variant: 'destructive', description: t(`errors.${kind}`) });
        },
      },
    );
  };

  const handleCancel = () => {
    if (!alert) return;
    remove.mutate(alert.id, {
      onSuccess: () => toast({ variant: 'success', description: t('backInStock.cancelled') }),
      onError: (error) =>
        toast({ variant: 'destructive', description: t(`errors.${alertErrorKind(error)}`) }),
    });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-muted/40 p-4" aria-live="polite">
      {isActive ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground" role="status">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('backInStock.active')}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isBusy}
            aria-busy={remove.isPending || undefined}
          >
            {t('backInStock.cancel')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('backInStock.hint')}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSubscribe}
            disabled={isBusy || (isAuthenticated && alertsQuery.isLoading)}
            aria-busy={subscribe.isPending || undefined}
            data-testid="notify-me"
          >
            <BellRing className="h-4 w-4" aria-hidden="true" />
            {subscribe.isPending ? t('saving') : t('backInStock.subscribe')}
          </Button>
        </div>
      )}
      <AlertLoginPrompt open={loginOpen} onOpenChange={setLoginOpen} returnTo={returnTo} />
    </div>
  );
}
