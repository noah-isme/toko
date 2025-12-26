'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

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

  const handleSliderChange = (newValue: number[]) => {
    setLocalValue([newValue[0], newValue[1]]);
  };

  const handleMinChange = (newMin: number) => {
    // Ensuring min doesn't exceed max is good UX, but Radix Slider handles bounds well too.
    // We'll trust Radix for the slider but enforce it here for inputs.
    const validMin = Math.min(Math.max(newMin, min), localValue[1]);
    setLocalValue([validMin, localValue[1]]);
  };

  const handleMaxChange = (newMax: number) => {
    const validMax = Math.max(Math.min(newMax, max), localValue[0]);
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

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Price Range
        </label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatCurrency(localValue[0])}</span>
          <span>-</span>
          <span>{formatCurrency(localValue[1])}</span>
        </div>
      </div>

      {/* Radix UI Slider */}
      <Slider
        min={min}
        max={max}
        step={1000} // Appropriate step for currency
        value={localValue}
        onValueChange={handleSliderChange}
        className="mb-6 pt-2"
      />

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="min-price" className="text-xs font-medium text-muted-foreground">
            Min Price
          </label>
          <Input
            id="min-price"
            type="number"
            min={min}
            max={max}
            value={localValue[0]}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="max-price" className="text-xs font-medium text-muted-foreground">
            Max Price
          </label>
          <Input
            id="max-price"
            type="number"
            min={min}
            max={max}
            value={localValue[1]}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="h-8"
          />
        </div>
      </div>

      {/* Apply Button */}
      {(localValue[0] !== value[0] || localValue[1] !== value[1]) && (
        <Button onClick={handleApply} className="w-full" size="sm">
          Apply Filter
        </Button>
      )}
    </div>
  );
}
