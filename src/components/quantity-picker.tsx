'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface QuantityPickerProps {
  quantity: number;
  min?: number;
  max?: number;
  onChange: (quantity: number) => void;
}

export function QuantityPicker({ quantity, min = 1, max = 10, onChange }: QuantityPickerProps) {
  const decrease = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const increase = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button aria-label="Decrease quantity" size="icon" variant="outline" onClick={decrease}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-6 text-center text-sm font-medium">{quantity}</span>
      <Button aria-label="Increase quantity" size="icon" variant="outline" onClick={increase}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
