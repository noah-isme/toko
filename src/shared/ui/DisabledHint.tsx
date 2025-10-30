'use client';

import React, { useId } from 'react';

import { cn } from '@/lib/utils';

export interface DisabledHintProps {
  id?: string;
  message: string;
  className?: string;
  tone?: 'info' | 'warning';
}

export function DisabledHint({
  id: providedId,
  message,
  className,
  tone = 'info',
}: DisabledHintProps) {
  const autoId = useId();
  const id = providedId ?? autoId;

  return (
    <p
      id={id}
      role="note"
      className={cn(
        'mt-2 text-xs leading-relaxed',
        tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        className,
      )}
    >
      {message}
    </p>
  );
}
