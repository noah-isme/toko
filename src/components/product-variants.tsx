'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface ProductVariant {
  id: string;
  name: string;
  type: 'size' | 'color' | 'style';
  available: boolean;
  price?: number;
}

interface ProductVariantsProps {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onSelect: (variantId: string) => void;
  className?: string;
}

export function ProductVariants({
  variants,
  selectedVariantId,
  onSelect,
  className,
}: ProductVariantsProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  // Group variants by type
  const variantsByType = variants.reduce(
    (acc, variant) => {
      if (!acc[variant.type]) {
        acc[variant.type] = [];
      }
      acc[variant.type].push(variant);
      return acc;
    },
    {} as Record<string, ProductVariant[]>,
  );

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(variantsByType).map(([type, typeVariants]) => (
        <div key={type} className="space-y-2">
          <h3 className="text-sm font-semibold capitalize">{type}</h3>
          {type === 'color' ? (
            <ColorVariants
              variants={typeVariants}
              selectedId={selectedVariantId}
              onSelect={onSelect}
            />
          ) : (
            <StandardVariants
              variants={typeVariants}
              selectedId={selectedVariantId}
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StandardVariants({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const isSelected = selectedId === variant.id;
        const isDisabled = !variant.available;

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => !isDisabled && onSelect(variant.id)}
            disabled={isDisabled}
            className={cn(
              'min-w-[3rem] rounded-md border px-4 py-2 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected && 'border-primary bg-primary text-primary-foreground',
              !isSelected && !isDisabled && 'hover:border-primary hover:bg-primary/10',
              isDisabled && 'cursor-not-allowed opacity-50 line-through',
            )}
            aria-pressed={isSelected}
            aria-label={`Select ${variant.name}`}
          >
            {variant.name}
            {variant.price && (
              <span className="ml-1 text-xs">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(variant.price)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ColorVariants({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const isSelected = selectedId === variant.id;
        const isDisabled = !variant.available;
        const colorValue = getColorValue(variant.name);

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => !isDisabled && onSelect(variant.id)}
            disabled={isDisabled}
            className={cn(
              'relative h-10 w-10 rounded-full border-2 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected && 'border-primary ring-2 ring-primary/20',
              !isSelected && !isDisabled && 'hover:scale-110',
              isDisabled && 'cursor-not-allowed opacity-50',
            )}
            style={{ backgroundColor: colorValue }}
            aria-pressed={isSelected}
            aria-label={`Select ${variant.name} color`}
            title={variant.name}
          >
            {isDisabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-px w-full rotate-45 bg-red-500" />
              </div>
            )}
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white drop-shadow-md"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function getColorValue(colorName: string): string {
  const colors: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#A855F7',
    pink: '#EC4899',
    gray: '#6B7280',
    orange: '#F97316',
    brown: '#92400E',
    navy: '#1E3A8A',
    beige: '#D4B896',
    silver: '#C0C0C0',
    gold: '#FFD700',
  };

  return colors[colorName.toLowerCase()] || '#9CA3AF';
}
