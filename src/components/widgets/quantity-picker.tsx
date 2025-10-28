"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type QuantityPickerProps = {
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  ariaLabel?: string;
};

export const QuantityPicker = ({
  value,
  min = 1,
  max = 99,
  onChange,
  ariaLabel = "Item quantity",
}: QuantityPickerProps) => {
  const handleChange = (next: number) => {
    if (next < min || next > max) return;
    onChange?.(next);
  };

  return (
    <div className="flex items-center gap-2" aria-label={ariaLabel}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => handleChange(value - 1)}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{value}</span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => handleChange(value + 1)}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
};
