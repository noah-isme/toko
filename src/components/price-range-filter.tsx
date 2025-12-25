'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
}

export function PriceRangeFilter({ min, max, value, onChange, className }: PriceRangeFilterProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = (newMin: number) => {
    const validMin = Math.min(newMin, localValue[1]);
    setLocalValue([validMin, localValue[1]]);
  };

  const handleMaxChange = (newMax: number) => {
    const validMax = Math.max(newMax, localValue[0]);
    setLocalValue([localValue[0], validMax]);
  };

  const handleApply = () => {
    onChange(localValue);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Price Range</label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{formatCurrency(localValue[0])}</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-muted-foreground">{formatCurrency(localValue[1])}</span>
        </div>
      </div>

      {/* Dual Range Slider */}
      <div className="relative h-2 px-2.5">
        {/* Track */}
        <div className="absolute inset-x-2.5 h-2 rounded-full bg-muted" />

        {/* Active Range */}
        <div
          className="absolute h-2 rounded-full bg-primary"
          style={{
            left: `calc(${minPercent}% + 10px - ${minPercent * 0.2}px)`,
            right: `calc(${100 - maxPercent}% + 10px - ${(100 - maxPercent) * 0.2}px)`,
          }}
        />

        {/* Min Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[0]}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 h-2 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:ring-2 [&::-moz-range-thumb]:ring-background [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-background"
          aria-label="Minimum price"
        />

        {/* Max Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[1]}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 h-2 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:ring-2 [&::-moz-range-thumb]:ring-background [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-background"
          aria-label="Maximum price"
        />
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="min-price" className="text-xs text-muted-foreground">
            Min
          </label>
          <input
            id="min-price"
            type="number"
            min={min}
            max={max}
            value={localValue[0]}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="max-price" className="text-xs text-muted-foreground">
            Max
          </label>
          <input
            id="max-price"
            type="number"
            min={min}
            max={max}
            value={localValue[1]}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Apply Button */}
      {(localValue[0] !== value[0] || localValue[1] !== value[1]) && (
        <button
          type="button"
          onClick={handleApply}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Apply
        </button>
      )}
    </div>
  );
}
