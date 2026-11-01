'use client';

import { AlertCircle, Bell, ChevronDown, Save, SlidersHorizontal, Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { PriceRangeFilter } from '@/components/price-range-filter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  useSearchFacetsQuery,
  useSaveSearchMutation,
  useActiveFilterCount,
} from '@/entities/search/hooks';
import {
  hasPriceFilter,
  isPriceBucketSelected,
  priceRangeDisplayBounds,
  priceRangeForBucket,
} from '@/entities/search/lib/facets';
import type { SearchFilters, SearchFacet } from '@/entities/search/types';
import type { ProductFacets, ProductPriceBucket } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { NUMERIC_DATE, useFormat } from '@/shared/i18n/use-format';

/**
 * Facet counts from the product list response (GET /products?include=facets).
 * `data` is undefined while loading, or when the API returned no facets; the
 * sidebar then falls back to the category/brand taxonomy without counts.
 */
export interface FacetCountsState {
  data?: ProductFacets;
  isLoading: boolean;
}

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClearFilters?: () => void;
  facetCounts?: FacetCountsState;
  className?: string;
}

/** One selectable facet value; `count` is null when the source has no counts. */
interface FacetOption {
  value: string;
  label: string;
  count: number | null;
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

function matchesOption(option: FacetOption, selectedValue: string): boolean {
  const normalized = selectedValue.trim().toLowerCase();
  return option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized;
}

/**
 * Keeps the selected value visible even when it is not among the returned
 * options (facets list the top 50 by count), so it can still be cleared.
 */
function withSelectedOption(options: FacetOption[], selected: string | undefined): FacetOption[] {
  if (!selected || options.some((option) => matchesOption(option, selected))) return options;
  // No count: a value outside the top 50 may still have products.
  return [...options, { value: selected, label: selected, count: null }];
}

function taxonomyOptions(facets: SearchFacet[], type: 'category' | 'brand'): FacetOption[] {
  const name = type === 'category' ? 'categories' : 'brands';
  const facet = facets.find((f) => f.type === type || f.name === name);
  // The taxonomy endpoints carry no product counts (count 0 is "unknown").
  return facet?.values.map(({ value, label }) => ({ value, label, count: null })) ?? [];
}

function FacetCount({ count }: { count: number | null }) {
  const fmt = useFormat();
  if (count === null) return null;
  return <span className="text-xs tabular-nums text-muted-foreground">({fmt.number(count)})</span>;
}

/**
 * Single-select facet as a native radio group with an "all" option, because
 * the product API filters by one category and one brand at a time.
 */
function FacetRadioGroup({
  name,
  label,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  name: string;
  label: string;
  allLabel: string;
  options: FacetOption[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name={name}
          checked={!selected}
          onChange={() => onSelect(undefined)}
          className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
        />
        <span className="flex-1 truncate text-sm">{allLabel}</span>
      </label>
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={!!selected && matchesOption(option, selected)}
            onChange={() => onSelect(option.value)}
            className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="flex-1 truncate text-sm">{option.label}</span>
          <FacetCount count={option.count} />
        </label>
      ))}
    </div>
  );
}

function PriceBucketGroup({
  name,
  buckets,
  value,
  onChange,
}: {
  name: string;
  buckets: ProductPriceBucket[];
  value: SearchFilters['priceRange'];
  onChange: (range: [number, number] | undefined) => void;
}) {
  const t = useTranslations('catalog.filters');
  const fmt = useFormat();
  const visible = buckets.filter(
    (bucket) => bucket.count > 0 || isPriceBucketSelected(bucket, value),
  );
  // A URL range that matches no bucket (e.g. an old slider link) is listed as
  // its own checked option, so the group never shows nothing selected.
  const customRange =
    hasPriceFilter(value) && !buckets.some((bucket) => isPriceBucketSelected(bucket, value))
      ? priceRangeDisplayBounds(value, [])
      : null;
  const rangeLabel = ({ min, max }: { min: number; max: number | null }) =>
    max === null
      ? t('priceFrom', { min: fmt.currency(min) })
      : t('priceBetween', { min: fmt.currency(min), max: fmt.currency(max) });

  return (
    <div role="radiogroup" aria-label={t('price')} className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name={name}
          checked={!hasPriceFilter(value)}
          onChange={() => onChange(undefined)}
          className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
        />
        <span className="flex-1 truncate text-sm">{t('allPrices')}</span>
      </label>
      {visible.map((bucket) => (
        <label key={bucket.min} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            value={bucket.min}
            checked={isPriceBucketSelected(bucket, value)}
            onChange={() => onChange(priceRangeForBucket(bucket))}
            className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          {/* Wraps instead of truncating: the upper bound must stay readable in w-64/w-72. */}
          <span className="min-w-0 flex-1 break-words text-sm">{rangeLabel(bucket)}</span>
          <FacetCount count={bucket.count} />
        </label>
      ))}
      {customRange && (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            value="custom"
            checked
            readOnly
            className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
          <span className="min-w-0 flex-1 break-words text-sm">{rangeLabel(customRange)}</span>
        </label>
      )}
    </div>
  );
}

export function AdvancedFilterSidebar({
  filters,
  onFiltersChange,
  onClearFilters,
  facetCounts,
  className,
}: FilterSidebarProps) {
  const t = useTranslations('catalog.filters');
  const fmt = useFormat();
  const radioName = useId();
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount(filters);

  const serverFacets = facetCounts?.data;
  const waitingForServerFacets = !!facetCounts && !serverFacets && facetCounts.isLoading;
  // Without counts from the product response, list the catalog taxonomy instead.
  const useTaxonomy = !serverFacets && !waitingForServerFacets;
  const {
    data: taxonomyFacets = [],
    isLoading: taxonomyLoading,
    isError: taxonomyError,
    refetch: refetchTaxonomy,
  } = useSearchFacetsQuery(filters, { enabled: useTaxonomy });
  const facets = useTaxonomy ? taxonomyFacets : [];
  const facetsLoading = waitingForServerFacets || (useTaxonomy && taxonomyLoading);
  const facetsError = useTaxonomy && taxonomyError;

  const selectedCategory = filters.categories?.[0];
  const selectedBrand = filters.brands?.[0];
  const categoryOptions = withSelectedOption(
    serverFacets
      ? serverFacets.categories.map(({ slug, name, count }) => ({
          value: slug,
          label: name,
          count,
        }))
      : taxonomyOptions(facets, 'category'),
    selectedCategory,
  );
  const brandOptions = withSelectedOption(
    serverFacets
      ? serverFacets.brands.map(({ slug, name, count }) => ({ value: slug, label: name, count }))
      : taxonomyOptions(facets, 'brand'),
    selectedBrand,
  );

  const saveSearch = useSaveSearchMutation();

  const hasActiveFilters = activeCount > 0;

  // Rendered twice (mobile sheet and desktop panel); radio names are scoped per copy.
  const renderFilterContent = (scope: 'mobile' | 'desktop') => (
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
            <Button variant="outline" size="sm" onClick={() => refetchTaxonomy()}>
              {t('retry')}
            </Button>
          </div>
        </div>
      )}

      {categoryOptions.length > 0 && (
        <FilterSection title={t('categories')}>
          <FacetRadioGroup
            name={`${radioName}-${scope}-category`}
            label={t('categories')}
            allLabel={t('allCategories')}
            options={categoryOptions}
            selected={selectedCategory}
            onSelect={(value) => onFiltersChange({ categories: value ? [value] : [] })}
          />
        </FilterSection>
      )}

      {brandOptions.length > 0 && (
        <FilterSection title={t('brands')}>
          <FacetRadioGroup
            name={`${radioName}-${scope}-brand`}
            label={t('brands')}
            allLabel={t('allBrands')}
            options={brandOptions}
            selected={selectedBrand}
            onSelect={(value) => onFiltersChange({ brands: value ? [value] : [] })}
          />
        </FilterSection>
      )}

      {/* Price: bucket counts from the API, else the range slider for a URL price */}
      {serverFacets ? (
        <FilterSection title={t('price')}>
          <PriceBucketGroup
            name={`${radioName}-${scope}-price`}
            buckets={serverFacets.price.buckets}
            value={filters.priceRange}
            onChange={(priceRange) => onFiltersChange({ priceRange })}
          />
        </FilterSection>
      ) : (
        filters.priceRange && (
          <FilterSection title={t('price')}>
            <PriceRangeFilter
              min={filters.priceRange[0]}
              max={filters.priceRange[1]}
              value={filters.priceRange}
              onChange={(value) => onFiltersChange({ priceRange: value })}
            />
          </FilterSection>
        )
      )}

      {serverFacets && (
        <FilterSection title={t('availability')}>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={filters.inStockOnly ?? false}
              onChange={(e) => onFiltersChange({ inStockOnly: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
            <span className="flex-1 text-sm">{t('inStockOnly')}</span>
            <FacetCount count={serverFacets.inStock.true} />
          </label>
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
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-4">
            {renderFilterContent('mobile')}
          </div>
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
        {renderFilterContent('desktop')}
        <Separator className="my-4" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              saveSearch.mutate({
                name: t('savedSearchName', { date: fmt.date(new Date(), NUMERIC_DATE) }),
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
                name: t('savedSearchName', { date: fmt.date(new Date(), NUMERIC_DATE) }),
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
