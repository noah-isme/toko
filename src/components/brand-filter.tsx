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
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-semibold">Brands</h4>
      <div className="space-y-2">
        {uniqueBrands.map((brand) => {
          const checked = selectedBrands.includes(brand);
          return (
            <label
              key={brand}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm transition-colors',
                'hover:bg-accent',
                checked && 'bg-accent',
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                checked={checked}
                onChange={() => onToggleBrand(brand)}
              />
              <span className={cn(checked && 'font-medium')}>{brand}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
