'use client';

import { AlertCircle, Bell, ChevronDown, Save, SlidersHorizontal, Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PriceRangeFilter } from '@/components/price-range-filter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  useSearchFacetsQuery,
  useSaveSearchMutation,
  useActiveFilterCount,
} from '@/entities/search/hooks';
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

function toggleFacetValue(currentValues: string[], value: string, label: string): string[] {
  const normalizedFacetValues = new Set([value, label].map((item) => item.trim().toLowerCase()));
  const isSelected = currentValues.some((currentValue) =>
    normalizedFacetValues.has(currentValue.trim().toLowerCase()),
  );

  return isSelected
    ? currentValues.filter(
        (currentValue) => !normalizedFacetValues.has(currentValue.trim().toLowerCase()),
      )
    : [...currentValues, value];
}

function renderFacetValues(
  facet: SearchFacet,
  filters: SearchFilters,
  onToggle: (value: string, label: string) => void,
) {
  const isMultiSelect = facet.multiSelect ?? true;
  const selectedValues =
    facet.type === 'category' || facet.name === 'categories'
      ? (filters.categories ?? [])
      : facet.type === 'brand' || facet.name === 'brands'
        ? (filters.brands ?? [])
        : null;

  const isSelected = (value: string, label: string, fallback?: boolean) => {
    if (!selectedValues) return fallback ?? false;

    const normalizedValues = new Set([value.toLowerCase(), label.toLowerCase()]);
    return selectedValues.some((selectedValue) =>
      normalizedValues.has(selectedValue.toLowerCase()),
    );
  };

  return (
    <div className="space-y-2">
      {facet.values.map(({ value, label, count, selected }) => (
        <label key={value} className="flex cursor-pointer items-center gap-2">
          <input
            type={isMultiSelect ? 'checkbox' : 'radio'}
            checked={isSelected(value, label, selected)}
            onChange={() => onToggle(value, label)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="flex-1 truncate text-sm">{label}</span>
          {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
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
  const t = useTranslations('catalog.filters');
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount(filters);

  const {
    data: facets = [],
    isLoading: facetsLoading,
    isError: facetsError,
    refetch: refetchFacets,
  } = useSearchFacetsQuery(filters);

  const saveSearch = useSaveSearchMutation();

  const hasActiveFilters = activeCount > 0;

  const filterContent = (
    <div className="space-y-1">
      {facetsLoading && (
        <div className="space-y-2 py-2" role="status" aria-label={t('loading')}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {facetsError && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-2">
            <p>{t('unavailable')}</p>
            <Button variant="outline" size="sm" onClick={() => refetchFacets()}>
              {t('retry')}
            </Button>
          </div>
        </div>
      )}

      {/* Categories from facets */}
      {facets
        .filter((f) => f.type === 'category' || f.name === 'categories')
        .map((facet) => (
          <FilterSection key={facet.name} title={t('categories')}>
            {renderFacetValues(facet, filters, (value, label) => {
              const current = filters.categories || [];
              onFiltersChange({
                categories: toggleFacetValue(current, value, label),
              });
            })}
          </FilterSection>
        ))}

      {/* Brands from facets */}
      {facets
        .filter((f) => f.type === 'brand' || f.name === 'brands')
        .map((facet) => (
          <FilterSection key={facet.name} title={t('brands')}>
            {renderFacetValues(facet, filters, (value, label) => {
              const current = filters.brands || [];
              onFiltersChange({
                brands: toggleFacetValue(current, value, label),
              });
            })}
          </FilterSection>
        ))}

      {/* Price Range */}
      {filters.priceRange && (
        <FilterSection title={t('price')}>
          <PriceRangeFilter
            min={filters.priceRange[0]}
            max={filters.priceRange[1]}
            value={filters.priceRange}
            onChange={(value) => onFiltersChange({ priceRange: value })}
          />
        </FilterSection>
      )}

      {/* Rating from facets */}
      {facets &&
        facets.length > 0 &&
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
                            i < Number(value)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground',
                          )}
                        />
                      ))}
                      <span className="text-sm">{t('ratingStars', { rating: value })}</span>
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
                  <span className="text-sm">{t('allRatings')}</span>
                </label>
              </div>
            </FilterSection>
          ))}

      {/* Boolean filters */}
      {facets &&
        facets.length > 0 &&
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
                        onChange={(e) =>
                          onFiltersChange({
                            [filterKey]: e.target.checked,
                          } as Partial<SearchFilters>)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                      <span className="text-sm">{label}</span>
                      <span className="text-xs text-muted-foreground">({count})</span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          ))}

      {/* Custom attributes from facets */}
      {facets &&
        facets.length > 0 &&
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
          ))}
    </div>
  );

  // Mobile drawer
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full gap-2 sm:w-auto lg:hidden',
              hasActiveFilters && 'border-primary text-primary',
            )}
            size="sm"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('heading')}
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
              <SheetTitle className="text-lg">{t('sheetTitle')}</SheetTitle>
              {hasActiveFilters && onClearFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  {t('clearAll')}
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-4">{filterContent}</div>
          <div className="sticky bottom-0 border-t bg-background p-4">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                {t('close')}
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                {t('apply')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div
        className={cn(
          'sticky top-24 hidden w-64 shrink-0 self-start rounded-xl border bg-card p-4 lg:block',
          className,
        )}
        style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{t('heading')}</h2>
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
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              saveSearch.mutate({
                name: t('savedSearchName', { date: new Date().toLocaleDateString('id-ID') }),
                filters,
              })
            }
          >
            <Save className="mr-1 h-4 w-4" />
            {t('save')}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() =>
              saveSearch.mutate({
                name: t('savedSearchName', { date: new Date().toLocaleDateString('id-ID') }),
                filters,
                alertEnabled: true,
              })
            }
          >
            <Bell className="mr-1 h-4 w-4" />
            {t('notify')}
          </Button>
        </div>
      </div>
    </>
  );
}
