'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';

import { useCreateReviewMutation } from '../hooks';
import { isReviewValidationKey, reviewCreateInputSchema, type ReviewCreateInput } from '../types';

import { Stars } from './Stars';

import { ImageUpload } from '@/components/image-upload';
import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

export interface ReviewFormProps {
  productId: string;
  className?: string;
}

export function ReviewForm({ productId, className }: ReviewFormProps) {
  const t = useTranslations('product.reviews.form');
  const tv = useTranslations('product.reviews.validation');
  // Schema errors are catalog keys; anything else (e.g. a server message) is shown as is.
  const errorText = (message?: string) => (isReviewValidationKey(message) ? tv(message) : message);
  const form = useForm<ReviewCreateInput>({
    resolver: zodResolver(reviewCreateInputSchema),
    defaultValues: {
      rating: undefined,
      body: '',
      photos: [],
    },
  });

  const { mutate, isPending, isProductInFlight } = useCreateReviewMutation(productId);
  const bodyValue = form.watch('body') ?? '';
  const photoFiles = form.watch('photos') ?? [];
  const remaining = 1000 - bodyValue.length;
  const { toast } = useToast();
  const ratingError = errorText(form.formState.errors.rating?.message);
  const ratingErrorId = ratingError ? 'review-rating-error' : undefined;
  const bodyError = errorText(form.formState.errors.body?.message);
  const bodyErrorId = bodyError ? 'review-body-error' : undefined;
  const rootError = errorText(form.formState.errors.root?.message);

  const bodyFieldId = 'review-body';
  const ratingLabelId = 'review-rating-label';

  const handleSubmit = form.handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => {
        form.reset({ rating: undefined, body: '' });
      },
    });
  });

  const isSubmitting = isPending || isProductInFlight();

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div>
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      {rootError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {rootError}
        </div>
      ) : null}
      <div className="space-y-2">
        <p id={ratingLabelId} className="text-sm font-medium">
          {t('rating')}
        </p>
        <Controller
          control={form.control}
          name="rating"
          render={({ field }) => (
            <Stars
              {...field}
              id="review-rating"
              value={field.value}
              onChange={(value) => field.onChange(value)}
              onBlur={field.onBlur}
              aria-describedby={ratingErrorId}
              aria-invalid={Boolean(ratingError)}
              aria-labelledby={ratingLabelId}
              aria-required="true"
              disabled={isSubmitting}
            />
          )}
        />
        {ratingError ? (
          <p id={ratingErrorId} role="alert" className="text-xs text-destructive">
            {ratingError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label htmlFor={bodyFieldId} className="text-sm font-medium">
          {t('body')}
        </label>
        <textarea
          {...form.register('body')}
          id={bodyFieldId}
          aria-invalid={bodyError ? 'true' : 'false'}
          aria-describedby={
            [bodyErrorId, 'review-body-limit'].filter(Boolean).join(' ') || undefined
          }
          maxLength={1000}
          rows={4}
          disabled={isSubmitting}
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder={t('placeholder')}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {bodyError ? (
            <p id={bodyErrorId} role="alert" className="text-destructive">
              {bodyError}
            </p>
          ) : (
            <span aria-live="polite" id={bodyErrorId ?? undefined}>
              &nbsp;
            </span>
          )}
          <span id="review-body-limit" aria-live="polite">
            {t('remaining', { count: String(remaining) })}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('photos')}</label>
        <ImageUpload
          value={photoFiles}
          onChange={(files) => form.setValue('photos', files, { shouldValidate: true })}
          maxFiles={5}
          maxSizeMB={5}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">{t('photosHint')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <GuardedButton
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          loadingLabel={t('submitting')}
        >
          {t('submit')}
        </GuardedButton>
        <p className="text-xs text-muted-foreground">{t('moderationNote')}</p>
      </div>
    </form>
  );
}
