'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useReviewListQuery } from '../hooks';
import type { ReviewListParams, ReviewSort } from '../types';

import { ReviewItem } from './ReviewItem';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: 'recent', label: 'Terbaru' },
  { value: 'rating-high', label: 'Rating tertinggi' },
];

export interface ReviewListProps {
  productId: string;
  pageSize?: number;
  className?: string;
}

export function ReviewList({ productId, pageSize = 5, className }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewSort>('recent');

  const queryParams = useMemo<ReviewListParams>(
    () => ({
      page,
      pageSize,
      sort,
    }),
    [page, pageSize, sort],
  );

  const { data, isLoading, isFetching, error } = useReviewListQuery(productId, queryParams);

  const totalPages = data?.meta.totalPages ?? 1;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const handlePrev = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const handleNext = () => {
    setPage((current) => current + 1);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(event.target.value as ReviewSort);
    setPage(1);
  };

  return (
    <section className={cn('space-y-4', className)} aria-label="Daftar ulasan produk">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Ulasan pelanggan</h2>
          <p className="text-sm text-muted-foreground">Baca pengalaman pembeli lainnya.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="review-sort" className="text-muted-foreground">
            Urutkan
          </label>
          <select
            id="review-sort"
            value={sort}
            onChange={handleSortChange}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        Menampilkan halaman {data?.meta.page ?? page} dari {totalPages}
      </span>
      {isLoading ? (
        <ReviewListSkeleton count={pageSize} />
      ) : error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Gagal memuat ulasan: {(error as Error).message}
        </p>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-3" aria-busy={isFetching ? 'true' : undefined}>
          {data.data.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada ulasan"
          description="Jadilah yang pertama membagikan pengalaman Anda dengan produk ini."
        />
      )}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!hasPrev || isFetching}
          className="rounded-md px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </button>
        <p className="text-muted-foreground">
          Halaman {data?.meta.page ?? page} dari {Math.max(totalPages, 1)}
        </p>
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasNext || isFetching}
          className="rounded-md px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Halaman berikutnya"
        >
          Selanjutnya
        </button>
      </div>
      {isFetching ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Memperbarui ulasan…
        </div>
      ) : null}
    </section>
  );
}

function ReviewListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border/50 p-4">
          <BaseSkeleton className="h-4 w-1/5" />
          <BaseSkeleton className="h-4 w-full" />
          <BaseSkeleton className="h-4 w-11/12" />
          <BaseSkeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}
