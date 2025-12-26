'use client';

import { ChevronDown, Filter, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BrandFilter } from '@/components/brand-filter';
import { PriceRangeFilter } from '@/components/price-range-filter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface FilterSidebarProps {
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  brands?: string[];
  selectedBrands?: string[];
  onToggleBrand?: (brand: string) => void;
  priceRange?: [number, number];
  priceRangeValue?: [number, number];
  onPriceRangeChange?: (value: [number, number]) => void;
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isOpen ? 'rotate-180' : '')}
        />
      </button>
      {isOpen && <div className="mb-2 mt-2 animate-in slide-in-from-top-2">{children}</div>}
      <Separator className="mt-2" />
    </div>
  );
}

export function FilterSidebar({
  categories,
  selectedCategories,
  onToggleCategory,
  brands = [],
  selectedBrands = [],
  onToggleBrand,
  priceRange = [0, 10000000],
  priceRangeValue = [0, 10000000],
  onPriceRangeChange,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const uniqueCategories = useMemo(() => Array.from(new Set(categories)).sort(), [categories]);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    (priceRangeValue &&
      (priceRangeValue[0] !== priceRange[0] || priceRangeValue[1] !== priceRange[1]));

  const filterContent = (
    <div className="space-y-1">
      {/* Price Range Filter */}
      {onPriceRangeChange && (
        <FilterSection title="Price Range">
          <PriceRangeFilter
            min={priceRange[0]}
            max={priceRange[1]}
            value={priceRangeValue}
            onChange={onPriceRangeChange}
          />
        </FilterSection>
      )}

      {/* Categories Filter */}
      <FilterSection title="Categories">
        <div className="space-y-3">
          {uniqueCategories.map((category) => {
            const checked = selectedCategories.includes(category);
            return (
              <label
                key={category}
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
                {/* Fallback checkbox if custom one is tricky without component */}
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={() => onToggleCategory(category)}
                />
                <span className="capitalize">{category}</span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Brand Filter */}
      {onToggleBrand && brands.length > 0 && (
        <FilterSection title="Brands">
          <BrandFilter
            brands={brands}
            selectedBrands={selectedBrands}
            onToggleBrand={onToggleBrand}
          />
        </FilterSection>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                onClick={() => {
                  // This is a visual-only reset handler placeholder.
                  // Real implementation would depend on how parent handles state reset.
                  // For now user has to manually uncheck.
                }}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="p-1">{filterContent}</div>
          </div>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="w-full lg:hidden" variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col gap-4 sm:max-w-xs">
          <SheetHeader className="text-left">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto pr-6">{filterContent}</div>
          <div className="border-t pt-4">
            <Button className="w-full" onClick={() => setOpen(false)}>
              Show Results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
