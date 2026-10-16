'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export type DelayedLoaderVariant = 'inline' | 'overlay';

export interface DelayedLoaderProps {
  active: boolean;
  variant?: DelayedLoaderVariant;
  label?: string;
  delayMs?: number;
  className?: string;
}

const DEFAULT_DELAY = 400;

export function DelayedLoader({
  active,
  variant = 'inline',
  label,
  delayMs = DEFAULT_DELAY,
  className,
}: DelayedLoaderProps) {
  const t = useTranslations('common.ui');
  const text = label ?? t('loading');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = setTimeout(() => setVisible(true), delayMs);

    // Cleanup runs when `active`/`delayMs` change or on unmount: cancel the pending
    // timer and reset visibility. Resetting here (not in the effect body) keeps the
    // next activation honoring the delay again without a synchronous setState render.
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [active, delayMs]);

  // Gate on `active` too, so deactivation hides immediately even before cleanup settles.
  if (!active || !visible) {
    return null;
  }

  if (variant === 'overlay') {
    return (
      <div
        aria-live="polite"
        role="status"
        className={cn(
          'absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm',
          className,
        )}
      >
        <Spinner label={text} />
      </div>
    );
  }

  return (
    <span
      aria-live="polite"
      role="status"
      className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
    >
      <Spinner label={text} />
    </span>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="prm:no-anim h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
