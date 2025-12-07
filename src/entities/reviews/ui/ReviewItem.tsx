'use client';

import { Star, ThumbsUp } from 'lucide-react';
import { memo } from 'react';

import { useVoteHelpfulMutation } from '../hooks';
import type { Review } from '../types';

import { cn } from '@/lib/utils';

interface ReviewItemProps {
  review: Review;
}

function formatReviewDate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderStatus(status: Review['status']) {
  if (status === 'approved') {
    return null;
  }

  const label = status === 'pending' ? 'Menunggu moderasi' : 'Ditolak';
  const styles =
    status === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-destructive/40 bg-destructive/10 text-destructive';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      {label}
    </span>
  );
}

export const ReviewItem = memo(function ReviewItem({ review }: ReviewItemProps) {
  const { mutate, isPending, isReviewInFlight } = useVoteHelpfulMutation(review.id);
  const helpfulActive = review.myVote === 'up';
  const voteInFlight = isPending || isReviewInFlight();

  const handleHelpfulToggle = () => {
    const nextDir = helpfulActive ? 'clear' : 'up';
    mutate(nextDir);
  };

  return (
    <article
      className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-4 shadow-sm"
      aria-label={`Ulasan oleh ${review.author ?? 'Anonim'}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{review.author ?? 'Anonim'}</p>
          <p className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</p>
        </div>
        {renderStatus(review.status)}
      </header>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const starValue = index + 1;
            const filled = starValue <= review.rating;
            return (
              <Star
                key={starValue}
                className={cn(
                  'h-4 w-4',
                  filled ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground',
                )}
                aria-hidden="true"
              />
            );
          })}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{review.rating}/5</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{review.body}</p>
      <div>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            helpfulActive
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:text-primary',
            voteInFlight && 'opacity-60',
          )}
          aria-pressed={helpfulActive}
          onClick={handleHelpfulToggle}
          disabled={voteInFlight}
        >
          <span className="sr-only">Tandai ulasan ini bermanfaat</span>
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          Bermanfaat
          <span className="text-xs text-muted-foreground">({review.helpfulCount})</span>
        </button>
      </div>
    </article>
  );
});
