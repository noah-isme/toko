'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface BrandFilterProps {
  brands: string[];
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  className?: string;
}

export function BrandFilter({
  brands,
  selectedBrands,
  onToggleBrand,
  className,
}: BrandFilterProps) {
  const uniqueBrands = useMemo(() => Array.from(new Set(brands)).sort(), [brands]);

  if (uniqueBrands.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {uniqueBrands.map((brand) => {
        const checked = selectedBrands.includes(brand);
        return (
          <label
            key={brand}
            className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <div
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border border-primary',
                checked ? 'bg-primary text-primary-foreground' : 'bg-background',
              )}
            >
              {checked && <div className="h-2 w-2 rounded-full bg-current" />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={checked}
              onChange={() => onToggleBrand(brand)}
            />
            <span>{brand}</span>
          </label>
        );
      })}
    </div>
  );
}
