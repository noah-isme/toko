import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  reviewCount?: number;
  className?: string;
}

export function Rating({ value, reviewCount, className }: RatingProps) {
  const stars = Array.from({ length: 5 }, (_, index) => index + 1);

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {stars.map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
          )}
        />
      ))}
      <span>{value.toFixed(1)}</span>
      {typeof reviewCount === 'number' ? <span className="text-xs">({reviewCount})</span> : null}
    </div>
  );
}
