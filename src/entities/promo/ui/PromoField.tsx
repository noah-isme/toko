'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';

import { useApplyPromoMutation, useRemovePromoMutation, useValidatePromoQuery } from '../hooks';
import { promoApplyInputSchema, type PromoApplyInput } from '../schemas';

import { useCartQuery } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';
import { normalizeError } from '@/shared/lib/normalizeError';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { GuardedButton } from '@/shared/ui/GuardedButton';

interface CartWithMeta {
  promoInfo?: {
    code: string;
    label?: string;
    discountValue?: number;
  };
  totals?: {
    discount?: number;
  };
}

export interface PromoFieldProps {
  cartId?: string | null;
  className?: string;
}

export function PromoField({ cartId, className }: PromoFieldProps) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const form = useForm<PromoApplyInput>({
    resolver: zodResolver(promoApplyInputSchema),
    defaultValues: { code: '' },
  });

  const normalizedCode = (form.watch('code') ?? '').trim();
  const { data: cart } = useCartQuery(cartId ?? undefined);
  const cartMeta = cart as typeof cart & CartWithMeta;
  const appliedPromo = cartMeta?.promoInfo;

  const applyMutation = useApplyPromoMutation(cartId ?? undefined);
  const removeMutation = useRemovePromoMutation(cartId ?? undefined);
  const validateQuery = useValidatePromoQuery(cartId ?? null, normalizedCode);

  useEffect(() => {
    if (!normalizedCode && !appliedPromo) {
      form.clearErrors('code');
    }
  }, [appliedPromo, form, normalizedCode]);

  if (!cartId) {
    return null;
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const code = values.code.trim();
    if (!code) {
      form.setError('code', { type: 'manual', message: 'Kode promo wajib diisi' });
      return;
    }

    try {
      const validation = await validateQuery.refetch();
      if (!validation.data?.valid || !validation.data.promo) {
        form.setError('code', {
          type: 'validate',
          message: validation.data?.message ?? 'Kode promo tidak valid',
        });
        return;
      }

      applyMutation.mutate(
        { code: code.toUpperCase(), preview: validation.data },
        {
          onSuccess: () => {
            form.reset({ code: '' });
          },
        },
      );
    } catch (error) {
      form.setError('code', {
        type: 'validate',
        message: normalizeError(error),
      });
    }
  });

  const isBusy = applyMutation.isPending || removeMutation.isPending;
  const helperText = appliedPromo
    ? (appliedPromo.label ?? `Kode ${appliedPromo.code} aktif`)
    : 'Masukkan kode promo untuk mendapatkan diskon.';

  const discountText = appliedPromo?.discountValue
    ? `Menghemat ${formatCurrency(appliedPromo.discountValue)} saat checkout.`
    : undefined;

  const errorMessage = form.formState.errors.code?.message;

  return (
    <section className={cn('space-y-3 rounded-lg border p-4', className)}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Kode Promo</h2>
        <p id={helperId} className="text-sm text-muted-foreground">
          {helperText}
          {discountText ? <span className="block text-emerald-600">{discountText}</span> : null}
        </p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor={inputId} className="text-sm font-medium">
            Masukkan kode
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              {...form.register('code')}
              aria-describedby={errorMessage ? `${errorId} ${helperId}` : helperId}
              aria-invalid={errorMessage ? 'true' : undefined}
              disabled={isBusy || Boolean(appliedPromo)}
              className="prm:no-anim w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 ease-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="contoh: SAVE10"
            />
            <GuardedButton
              type="submit"
              size="sm"
              className="w-full sm:w-auto"
              disabled={isBusy || Boolean(appliedPromo) || !normalizedCode}
              isLoading={applyMutation.isPending}
              loadingLabel="Menerapkan promo…"
            >
              Terapkan
            </GuardedButton>
          </div>
          {errorMessage ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>
        {appliedPromo ? (
          <div className="space-y-2 rounded-md border border-emerald-200/70 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-medium">Kode {appliedPromo.code} aktif.</p>
            {cartMeta?.totals?.discount ? (
              <p>
                Diskon:{' '}
                <span className="font-semibold">{formatCurrency(cartMeta.totals.discount)}</span>
              </p>
            ) : null}
            <GuardedButton
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              isLoading={removeMutation.isPending}
              loadingLabel="Menghapus kode…"
              onClick={() => removeMutation.mutate()}
            >
              Hapus kode
            </GuardedButton>
          </div>
        ) : null}
      </form>
      <DelayedLoader
        active={isBusy}
        label={removeMutation.isPending ? 'Menghapus kode promo…' : 'Menerapkan promo…'}
        delayMs={400}
        className="text-xs text-muted-foreground"
      />
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}
