'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';

import { useCreateQuestionMutation } from '../hooks';
import { isQAValidationKey, questionCreateInputSchema, type QuestionCreateInput } from '../types';

import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

export interface QuestionFormProps {
  productId: string;
  className?: string;
}

export function QuestionForm({ productId, className }: QuestionFormProps) {
  const t = useTranslations('product.qa.form');
  const tv = useTranslations('product.qa.validation');
  // Schema errors are catalog keys; anything else (e.g. a server message) is shown as is.
  const errorText = (message?: string) => (isQAValidationKey(message) ? tv(message) : message);
  const form = useForm<QuestionCreateInput>({
    resolver: zodResolver(questionCreateInputSchema),
    defaultValues: {
      question: '',
    },
  });

  const { mutate, isPending, isProductInFlight } = useCreateQuestionMutation(productId);
  const { toast } = useToast();

  const questionError = errorText(form.formState.errors.question?.message);
  const questionErrorId = questionError ? 'question-error' : undefined;
  const rootError = errorText(form.formState.errors.root?.message);

  const isSubmitting = isPending || isProductInFlight();

  const handleSubmit = form.handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => {
        form.reset({ question: '' });
      },
    });
  });

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div>
        <h3 className="text-lg font-semibold">{t('title')}</h3>
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
        <label htmlFor="question" className="text-sm font-medium">
          {t('label')}
        </label>
        <Controller
          control={form.control}
          name="question"
          render={({ field }) => (
            <textarea
              {...field}
              id="question"
              aria-invalid={questionError ? 'true' : 'false'}
              aria-describedby={questionErrorId}
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={t('placeholder')}
            />
          )}
        />
        {questionError ? (
          <p id={questionErrorId} role="alert" className="text-xs text-destructive">
            {questionError}
          </p>
        ) : null}
      </div>
      <GuardedButton
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        loadingLabel={t('submitting')}
        className="w-full"
      >
        {t('submit')}
      </GuardedButton>
    </form>
  );
}
