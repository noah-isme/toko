'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { useCreateQuestionMutation } from '../hooks';
import { questionCreateInputSchema, type QuestionCreateInput } from '../types';

import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

export interface QuestionFormProps {
  productId: string;
  className?: string;
}

export function QuestionForm({ productId, className }: QuestionFormProps) {
  const form = useForm<QuestionCreateInput>({
    resolver: zodResolver(questionCreateInputSchema),
    defaultValues: {
      question: '',
    },
  });

  const { mutate, isPending, isProductInFlight } = useCreateQuestionMutation(productId);
  const { toast } = useToast();

  const questionError = form.formState.errors.question?.message;
  const questionErrorId = questionError ? 'question-error' : undefined;
  const rootError = form.formState.errors.root?.message;

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
        <h3 className="text-lg font-semibold">Tanyakan tentang produk ini</h3>
        <p className="text-sm text-muted-foreground">
          Pertanyaan Anda akan dijawab oleh tim kami atau pembeli lain.
        </p>
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
          Pertanyaan Anda
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
              placeholder="Contoh: Apakah produk ini cocok untuk kulit sensitif?"
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
        loadingLabel="Mengirim..."
        className="w-full"
      >
        Ajukan Pertanyaan
      </GuardedButton>
    </form>
  );
}