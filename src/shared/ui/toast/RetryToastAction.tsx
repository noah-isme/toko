'use client';

import { useState } from 'react';

import type { ToastVariant } from './policy';

import { useToast } from './index';
import { useToastActionContext } from './index';

import { cn } from '@/lib/utils';

export interface RetryToastActionProps {
  onRetry: () => Promise<void> | void;
  label?: string;
  busyLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  errorVariant?: ToastVariant;
  errorEventKey?: string;
  className?: string;
}

export function RetryToastAction({
  onRetry,
  label = 'Coba lagi',
  busyLabel = 'Mencoba lagi…',
  errorTitle = 'Masih gagal',
  errorDescription = 'Tidak dapat menyelesaikan permintaan. Silakan coba lagi nanti.',
  errorVariant = 'destructive',
  errorEventKey,
  className,
}: RetryToastActionProps) {
  const { toastId, dismiss } = useToastActionContext();
  const { toast: pushToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const handleRetry = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    try {
      await Promise.resolve(onRetry());
      dismiss(toastId);
    } catch (error) {
      const message = (error instanceof Error && error.message) || errorDescription;

      pushToast({
        eventKey: errorEventKey ?? `retry-error-${toastId}`,
        title: errorTitle,
        description: message,
        variant: errorVariant,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRetry}
      disabled={isRunning}
      aria-busy={isRunning ? 'true' : undefined}
      className={cn(
        'inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow transition-colors duration-150 ease-out prm:no-anim hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-80',
        className,
      )}
    >
      <span aria-live="polite">{isRunning ? busyLabel : label}</span>
    </button>
  );
}
