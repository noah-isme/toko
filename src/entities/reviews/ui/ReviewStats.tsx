'use client';

import { useReviewStatsQuery } from '../hooks';
import type { ReviewRating } from '../types';

import { cn } from '@/lib/utils';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

const RATING_VALUES: ReviewRating[] = [5, 4, 3, 2, 1];

export interface ReviewStatsProps {
  productId: string;
  className?: string;
}

export function ReviewStats({ productId, className }: ReviewStatsProps) {
  const { data, isLoading, error } = useReviewStatsQuery(productId);

  if (isLoading) {
    return (
      <section className={cn('space-y-4 rounded-lg border border-border/60 p-4', className)}>
        <StatsSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className={cn('rounded-lg border border-destructive/30 p-4', className)}>
        <p className="text-sm text-destructive">
          Gagal memuat statistik ulasan: {(error as Error).message}
        </p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const hasReviews = data.totalCount > 0;

  return (
    <section className={cn('space-y-4 rounded-lg border border-border/60 p-4', className)}>
      <div>
        <h2 className="text-xl font-semibold">Penilaian produk</h2>
        <p className="text-sm text-muted-foreground">Rata-rata dari pelanggan toko.</p>
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-4xl font-bold">{data.averageRating.toFixed(1)}</p>
        <p className="text-sm text-muted-foreground">{data.totalCount} ulasan</p>
      </div>
      <dl className="space-y-2" aria-label="Distribusi rating">
        {RATING_VALUES.map((rating) => {
          const count = data.distribution[rating] ?? 0;
          const percent = hasReviews ? Math.round((count / data.totalCount) * 100) : 0;
          return (
            <div key={rating} className="flex items-center gap-2">
              <dt className="w-4 text-xs font-semibold">{rating}</dt>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${percent}%` }}
                  aria-hidden="true"
                />
              </div>
              <dd className="w-10 text-right text-xs text-muted-foreground">{percent}%</dd>
            </div>
          );
        })}
      </dl>
      {!hasReviews ? (
        <p className="text-sm text-muted-foreground">
          Belum ada ulasan yang dipublikasikan untuk produk ini.
        </p>
      ) : null}
    </section>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <BaseSkeleton className="h-5 w-1/2" />
      <BaseSkeleton className="h-10 w-24" />
      <div className="space-y-2">
        {RATING_VALUES.map((rating) => (
          <div key={rating} className="flex items-center gap-2">
            <BaseSkeleton className="h-3 w-4" />
            <BaseSkeleton className="h-2 flex-1" />
            <BaseSkeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
