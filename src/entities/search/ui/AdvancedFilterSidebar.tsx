'use client';

import { ChevronDown, Filter, Star, X, SlidersHorizontal, Save, Bell } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BrandFilter } from '@/components/brand-filter';
import { PriceRangeFilter } from '@/components/price-range-filter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSearchFacetsQuery, useSaveSearchMutation, useActiveFilterCount } from '@/entities/search/hooks';
import type { SearchFilters, SearchFacet } from '@/entities/search/types';
import { cn } from '@/lib/utils';

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClearFilters?: () => void;
  className?: string;
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
        className="flex w-full items-center justify-between py-2 text-sm font-medium transition-colors hover:text-primary"
      >
        {title}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          )}
        />
      </button>
      {isOpen && <div className="mb-2 mt-2 animate-in slide-in-from-top-2">{children}</div>}
      <Separator className="mt-2" />
    </div>
  );
}

function renderFacetValues(facet: SearchFacet, filters: SearchFilters, onToggle: (value: string) => void) {
  const isMultiSelect = facet.multiSelect ?? true;
  
  return (
    <div className="space-y-2">
      {facet.values.map(({ value, label, count, selected }) => (
        <label
          key={value}
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            type={isMultiSelect ? 'checkbox' : 'radio'}
            checked={selected ?? false}
            onChange={() => onToggle(value)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="flex-1 truncate text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </label>
      ))}
    </div>
  );
}

export function AdvancedFilterSidebar({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount(filters);
  
  // Use the facets query to get dynamic facet values from the API
  const { data: facets, isLoading: facetsLoading } = useSearchFacetsQuery(filters, {
    enabled: !!filters.query || !!filters.categories?.length || !!filters.brands?.length,
  });
  
  const saveSearch = useSaveSearchMutation();

  const hasActiveFilters =
    activeCount > 0;

  const filterContent = (
    <div className="space-y-1">
      {/* Categories from facets */}
      {facets && facets.length > 0 && (
        facets
          .filter((f) => f.type === 'category' || f.name === 'categories')
          .map((facet) => (
            <FilterSection key={facet.name} title={facet.label}>
              {facetsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                renderFacetValues(facet, filters, (value) => {
                  const current = filters.categories || [];
                  const isSelected = current.includes(value);
                  onFiltersChange({
                    categories: isSelected
                      ? current.filter((c) => c !== value)
                      : [...current, value],
                  });
                })
              )}
            </FilterSection>
          ))
      )}

      {/* Brands from facets */}
      {facets && facets.length > 0 && (
        facets
          .filter((f) => f.type === 'brand' || f.name === 'brands')
          .map((facet) => (
            <FilterSection key={facet.name} title={facet.label}>
              {facetsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                renderFacetValues(facet, filters, (value) => {
                  const current = filters.brands || [];
                  const isSelected = current.includes(value);
                  onFiltersChange({
                    brands: isSelected
                      ? current.filter((b) => b !== value)
                      : [...current, value],
                  });
                })
              )}
            </FilterSection>
          ))
      )}

      {/* Price Range */}
      {filters.priceRange && (
        <FilterSection title="Harga">
          <PriceRangeFilter
            min={filters.priceRange[0]}
            max={filters.priceRange[1]}
            value={filters.priceRange}
            onChange={(value) => onFiltersChange({ priceRange: value })}
          />
        </FilterSection>
      )}

      {/* Rating from facets */}
      {facets && facets.length > 0 && (
        facets
          .filter((f) => f.type === 'rating' || f.name === 'rating')
          .map((facet) => (
            <FilterSection key={facet.name} title={facet.label}>
              <div className="space-y-2">
                {facet.values.map(({ value, count, selected }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rating"
                      checked={filters.rating === Number(value)}
                      onChange={() => onFiltersChange({ rating: Number(value) })}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < Number(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                          )}
                        />
                      ))}
                      <span className="text-sm">{value}+ stars</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </div>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rating"
                    checked={filters.rating === null || filters.rating === undefined}
                    onChange={() => onFiltersChange({ rating: null })}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                  <span className="text-sm">Semua rating</span>
                </label>
              </div>
            </FilterSection>
          ))
      )}

      {/* Boolean filters */}
      {facets && facets.length > 0 && (
        facets
          .filter((f) => f.type === 'boolean')
          .map((facet) => (
            <FilterSection key={facet.name} title={facet.label}>
              <div className="space-y-2">
                {facet.values.map(({ value, label, count, selected }) => {
                  const filterKey = facet.name as keyof SearchFilters;
                  return (
                    <label key={value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected ?? false}
                        onChange={(e) => onFiltersChange({ [filterKey]: e.target.checked } as Partial<SearchFilters>)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <span className="text-sm">{label}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          ))
      )}

      {/* Custom attributes from facets */}
      {facets && facets.length > 0 && (
        facets
          .filter((f) => f.type === 'attribute')
          .map((facet) => (
            <FilterSection key={facet.name} title={facet.label}>
              <div className="space-y-2">
                {facet.values.map(({ value, label, count, selected }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type={facet.multiSelect ? 'checkbox' : 'radio'}
                      checked={selected ?? false}
                      onChange={() => {
                        const current = filters.attributes?.[facet.name] || [];
                        const isSelected = current.includes(value);
                        const newValues = isSelected
                          ? current.filter((v) => v !== value)
                          : [...current, value];
                        onFiltersChange({
                          attributes: { ...filters.attributes, [facet.name]: newValues },
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <span className="text-sm">{label}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          ))
      )}
    </div>
  );

  // Mobile drawer
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className={cn('gap-2', hasActiveFilters && 'border-primary text-primary')}
            size="sm"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filter
            {hasActiveFilters && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="max-h-screen w-72 p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Filter Produk</SheetTitle>
              {hasActiveFilters && onClearFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Hapus Semua
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-4">
            {filterContent}
          </div>
          <div className="sticky bottom-0 border-t bg-background p-4">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Tutup
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Terapkan
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 rounded-xl border bg-card p-4 lg:block" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Filter</h3>
          {hasActiveFilters && onClearFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Separator className="mb-4" />
        {filterContent}
        <Separator className="my-4" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => saveSearch.mutate({ 
            name: `Pencarian ${new Date().toLocaleDateString('id-ID')}`, 
            filters 
          })}>
            <Save className="mr-1 h-4 w-4" />
            Simpan
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => saveSearch.mutate({ 
            name: `Pencarian ${new Date().toLocaleDateString('id-ID')}`, 
            filters,
            alertEnabled: true
          })}>
            <Bell className="mr-1 h-4 w-4" />
            Notif
          </Button>
        </div>
      </div>
    </>
  );
}