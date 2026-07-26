'use client';

import { Loader2, ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  /** Invoked once the gesture passes the threshold and is released. */
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  /** Pull distance, in px, required to trigger a refresh. */
  threshold?: number;
  /** Disables the gesture entirely (e.g. while another action is in flight). */
  disabled?: boolean;
  className?: string;
}

/** Resistance applied to the drag so the sheet trails the finger. */
const DRAG_RESISTANCE = 0.5;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

/**
 * Wraps scrollable content with a touch pull-to-refresh gesture.
 *
 * The gesture only starts when the page is already scrolled to the top,
 * so it never fights normal scrolling. It is touch-only by design: desktop
 * users have other affordances, and synthesising it for mice would hijack
 * ordinary drags.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);

  const reset = useCallback(() => {
    startYRef.current = null;
    setPullDistance(0);
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (disabled || isRefreshing) {
        return;
      }
      // Only arm the gesture at the very top, otherwise this is a normal scroll.
      if (window.scrollY > 0) {
        startYRef.current = null;
        return;
      }
      startYRef.current = event.touches[0]?.clientY ?? null;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const startY = startYRef.current;
      if (startY === null || disabled || isRefreshing) {
        return;
      }
      const currentY = event.touches[0]?.clientY ?? startY;
      const delta = currentY - startY;
      if (delta <= 0) {
        // Upward movement: hand control back to the scroller.
        reset();
        return;
      }
      setPullDistance(delta * DRAG_RESISTANCE);
    },
    [disabled, isRefreshing, reset],
  );

  const handleTouchEnd = useCallback(async () => {
    const shouldRefresh = startYRef.current !== null && pullDistance >= threshold;
    startYRef.current = null;

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    setPullDistance(threshold);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, threshold]);

  const isArmed = pullDistance >= threshold;
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
    >
      <div
        aria-hidden={!showIndicator}
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: showIndicator ? Math.min(pullDistance, threshold * 1.5) : 0,
          transition: reducedMotionRef.current || pullDistance > 0 ? undefined : 'height 150ms',
        }}
      >
        {showIndicator ? (
          <span
            className="flex items-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {isRefreshing ? (
              <>
                <Loader2
                  className={cn('h-4 w-4', !reducedMotionRef.current && 'animate-spin')}
                  aria-hidden="true"
                />
                Memuat ulang…
              </>
            ) : (
              <>
                <ArrowDown
                  className={cn('h-4 w-4 transition-transform', isArmed && 'rotate-180')}
                  aria-hidden="true"
                />
                {isArmed ? 'Lepas untuk memuat ulang' : 'Tarik untuk memuat ulang'}
              </>
            )}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
