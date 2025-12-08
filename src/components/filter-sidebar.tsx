'use client';

import { Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BrandFilter } from '@/components/brand-filter';
import { PriceRangeFilter } from '@/components/price-range-filter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

  const filterContent = (
    <div className="space-y-6">
      {/* Price Range Filter */}
      {onPriceRangeChange && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Price Range</h4>
          <PriceRangeFilter
            min={priceRange[0]}
            max={priceRange[1]}
            value={priceRangeValue}
            onChange={onPriceRangeChange}
          />
        </div>
      )}

      {/* Categories Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Categories</h4>
        <div className="space-y-2">
          {uniqueCategories.map((category) => {
            const checked = selectedCategories.includes(category);
            return (
              <label
                key={category}
                className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="capitalize">{category}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => onToggleCategory(category)}
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Brand Filter */}
      {onToggleBrand && brands.length > 0 && (
        <BrandFilter
          brands={brands}
          selectedBrands={selectedBrands}
          onToggleBrand={onToggleBrand}
        />
      )}
    </div>
  );

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold">Filters</h3>
          {filterContent}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="lg:hidden" variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {filterContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
