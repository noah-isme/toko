'use client';

import { Star } from 'lucide-react';
import { Fragment } from 'react';

import type { ReviewRating } from '../types';

import { cn } from '@/lib/utils';

const STAR_VALUES: ReviewRating[] = [1, 2, 3, 4, 5];

export interface StarsProps {
  name: string;
  value?: number | null;
  onChange?: (rating: ReviewRating) => void;
  onBlur?: () => void;
  disabled?: boolean;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-labelledby'?: string;
  'aria-required'?: boolean | 'true' | 'false';
}

export function Stars({
  name,
  value,
  onChange,
  onBlur,
  disabled,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-labelledby': ariaLabelledBy,
  'aria-required': ariaRequired,
}: StarsProps) {
  return (
    <div
      role="radiogroup"
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-labelledby={ariaLabelledBy}
      aria-required={ariaRequired}
      className="flex items-center gap-3"
    >
      {STAR_VALUES.map((starValue) => {
        const checked = Number(value) === starValue;
        const inputId = `${id ?? name}-${starValue}`;

        return (
          <Fragment key={starValue}>
            <input
              type="radio"
              id={inputId}
              name={name}
              value={starValue}
              checked={checked}
              onChange={() => onChange?.(starValue)}
              onBlur={onBlur}
              disabled={disabled}
              className="peer sr-only"
            />
            <label
              htmlFor={inputId}
              className={cn(
                'inline-flex cursor-pointer flex-col items-center gap-1 rounded-md p-1 outline-none transition-colors',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'rounded-md p-1 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  checked ? 'text-yellow-500' : 'text-muted-foreground',
                )}
              >
                <Star
                  aria-hidden="true"
                  className={cn(
                    'h-6 w-6',
                    checked ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground',
                  )}
                />
              </span>
              <span className="sr-only">{starValue} bintang</span>
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}
