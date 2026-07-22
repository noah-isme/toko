'use client';

import { GitCompare } from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';
import {
  MAX_COMPARE_ITEMS,
  selectIsCompareFull,
  selectIsComparing,
  useCompareStore,
} from '@/stores/compare-store';

interface CompareToggleProps {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function CompareToggle({ productId, size = 'md', className }: CompareToggleProps) {
  const isComparing = useCompareStore(selectIsComparing(productId));
  const isFull = useCompareStore(selectIsCompareFull(productId));
  const toggle = useCompareStore((state) => state.toggle);

  const handleToggle = useCallback(() => {
    if (isFull) {
      return;
    }
    toggle(productId);
  }, [isFull, productId, toggle]);

  const disabled = isFull;
  const label = isComparing
    ? 'Hapus dari perbandingan'
    : isFull
      ? `Maksimal ${MAX_COMPARE_ITEMS} produk untuk dibandingkan`
      : 'Tambahkan ke perbandingan';

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      aria-pressed={isComparing}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full border bg-background transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isComparing && 'border-primary text-primary',
        sizeClasses[size],
        className,
      )}
    >
      <GitCompare size={iconSizes[size]} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
