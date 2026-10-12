'use client';

import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';

import { useQuestionListQuery } from '../hooks';
import type { Question, QuestionListParams, QuestionSort } from '../types';

import { QuestionItem } from './QuestionItem';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuestionListProps {
  productId: string;
  initialParams?: QuestionListParams;
  canAnswer?: boolean;
  className?: string;
}

/** Keys under `product.qa.list.sort` in the message catalogs. */
type QuestionSortLabelKey = 'recent' | 'popular' | 'unanswered';

const SORT_OPTIONS: {
  value: QuestionSort;
  labelKey: QuestionSortLabelKey;
  icon: React.ReactNode;
}[] = [
  { value: 'recent', labelKey: 'recent', icon: <HelpCircle className="h-4 w-4" /> },
  { value: 'popular', labelKey: 'popular', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'unanswered', labelKey: 'unanswered', icon: <HelpCircle className="h-4 w-4" /> },
];

export function QuestionList({
  productId,
  initialParams,
  canAnswer = false,
  className,
}: QuestionListProps) {
  const t = useTranslations('product.qa.list');
  const [params, setParams] = useState<QuestionListParams>({
    page: 1,
    pageSize: 10,
    sort: 'recent',
    ...initialParams,
  });

  const { data, isLoading, isFetching, error, refetch } = useQuestionListQuery(productId, params);
  const questions = data?.data ?? [];
  const meta = data?.meta;

  const handleSortChange = (sort: QuestionSort) => {
    setParams((prev) => ({ ...prev, sort, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-4"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-4 h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive',
          className,
        )}
      >
        {t('loadError')}{' '}
        <Button variant="link" size="sm" onClick={handleRefresh} className="h-auto p-0">
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)} data-testid="question-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <HelpCircle className="h-5 w-5 text-primary" />
          {t('title')}
          {meta && meta.total && (
            <span className="text-sm font-normal text-muted-foreground">({meta.total})</span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <Select value={params.sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]" aria-label={t('sortLabel')}>
              <SelectValue placeholder={t('sortPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {t(`sort.${option.labelKey}`)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {questions.length === 0 ? (
        <div
          className="rounded-lg border border-border/60 bg-background/30 py-12 text-center"
          data-testid="qa-empty-state"
        >
          <HelpCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4" role="list" aria-label={t('listLabel')}>
          {questions.map((question) => (
            <div key={question.id} role="listitem">
              <QuestionItem question={question} canAnswer={canAnswer} />
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2"
          aria-label={t('paginationLabel')}
          data-testid="qa-pagination"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange((params.page ?? 1) - 1)}
            disabled={(params.page ?? 1) <= 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            {t('page', { page: params.page ?? 1, total: meta.totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange((params.page ?? 1) + 1)}
            disabled={(params.page ?? 1) >= meta.totalPages || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}

      {isFetching && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
