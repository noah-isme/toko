'use client';

import { Search, Filter, X, Loader2, Star, Tag, Truck, Zap } from 'lucide-react';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/entities/catalog/hooks';
import {
  useSearchStateFromUrl,
  useSearchUrl,
  useActiveFilterCount,
  SORT_OPTIONS,
  buildSearchUrl,
} from '@/entities/search/hooks';
import {
  PRODUCTS_PAGE_SIZE,
  parseSearchStateFromUrl,
  toProductApiParams,
} from '@/entities/search/lib/apiParams';
import type { SearchFilters, SortOption } from '@/entities/search/types';
import { AdvancedFilterSidebar as AdvancedFilterSidebarComponent } from '@/entities/search/ui/AdvancedFilterSidebar';
import { cn } from '@/lib/utils';
import { useFormat } from '@/shared/i18n/use-format';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

const ITEMS_PER_PAGE = PRODUCTS_PAGE_SIZE;

export function AdvancedSearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('catalog');
  const fmt = useFormat();

  // Parse initial filters from URL - compute directly from searchParams to avoid useEffect setState
  const initialFilters = useMemo(() => parseSearchStateFromUrl(searchParams), [searchParams]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(initialFilters.page || 1);
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy || 'relevance');

  // Re-sync local state when the URL changes (adjusting state during render instead of in an effect).
  const [syncedFilters, setSyncedFilters] = useState(initialFilters);
  if (syncedFilters !== initialFilters) {
    setSyncedFilters(initialFilters);
    setFilters(initialFilters);
    setCurrentPage(initialFilters.page || 1);
    setSortBy(initialFilters.sortBy || 'relevance');
  }

  // Generate URL for current filters
  const searchUrl = useSearchUrl({ ...filters, page: currentPage, sortBy });
  const activeCount = useActiveFilterCount(filters);

  // Update URL when filters change
  const handleFiltersChange = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      const updated = { ...filters, ...newFilters, page: 1 };
      setFilters(updated);
      router.push(buildSearchUrl({ ...updated, page: 1, sortBy }) as Route, { scroll: false });
    },
    [filters, sortBy, router],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      router.push(buildSearchUrl({ ...filters, page, sortBy }) as Route, { scroll: false });
    },
    [filters, sortBy, router],
  );

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      const validSortBy = newSortBy as SortOption;
      setSortBy(validSortBy);
      router.push(buildSearchUrl({ ...filters, page: 1, sortBy: validSortBy }) as Route, {
        scroll: false,
      });
    },
    [filters, router],
  );

  const handleClearFilters = useCallback(() => {
    const cleared: SearchFilters = {
      categories: [],
      brands: [],
      priceRange: [0, 10000000],
      rating: null,
      inStockOnly: false,
      discountOnly: false,
      sortBy: 'relevance',
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      attributes: {},
    };
    setFilters(cleared);
    router.push('/products' as Route, { scroll: false });
  }, [router]);

  // Build API params from filters (shared with the /products Server Component prefetch)
  const apiParams = useMemo(
    () => toProductApiParams(filters, sortBy, currentPage),
    [filters, sortBy, currentPage],
  );

  // Fetch products
  const {
    data: productsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProducts(apiParams, {
    enabled: true,
  });

  const products = productsData?.data ?? [];
  const totalItems = productsData?.pagination?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const showLoadingState = isLoading || (!productsData && isFetching);

  // Active filters display
  const activeFilters = useMemo(() => {
    const items: Array<{ label: string; onRemove: () => void }> = [];

    if (filters.query) {
      items.push({
        label: t('chips.query', { query: filters.query }),
        onRemove: () => handleFiltersChange({ query: undefined }),
      });
    }
    filters.categories?.forEach((cat) => {
      items.push({
        label: t('chips.category', { value: cat }),
        onRemove: () =>
          handleFiltersChange({ categories: filters.categories!.filter((c) => c !== cat) }),
      });
    });
    filters.brands?.forEach((brand) => {
      items.push({
        label: t('chips.brand', { value: brand }),
        onRemove: () => handleFiltersChange({ brands: filters.brands!.filter((b) => b !== brand) }),
      });
    });
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000)) {
      items.push({
        label: t('chips.price', {
          min: fmt.currency(filters.priceRange[0]),
          max: fmt.currency(filters.priceRange[1]),
        }),
        onRemove: () => handleFiltersChange({ priceRange: [0, 10000000] }),
      });
    }
    if (filters.rating) {
      items.push({
        label: t('chips.rating', { rating: filters.rating }),
        onRemove: () => handleFiltersChange({ rating: null }),
      });
    }
    if (filters.inStockOnly) {
      items.push({
        label: t('chips.inStock'),
        onRemove: () => handleFiltersChange({ inStockOnly: false }),
      });
    }
    if (filters.discountOnly) {
      items.push({
        label: t('chips.discount'),
        onRemove: () => handleFiltersChange({ discountOnly: false }),
      });
    }
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([attr, values]) => {
        values.forEach((val) => {
          items.push({
            label: `${attr}: ${val}`,
            onRemove: () =>
              handleFiltersChange({
                attributes: {
                  ...filters.attributes!,
                  [attr]: filters.attributes![attr].filter((v) => v !== val),
                },
              }),
          });
        });
      });
    }
    return items;
  }, [filters, fmt, handleFiltersChange, t]);

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        <p>{t('results.loadError')}</p>
        <p className="text-sm">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          {t('results.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('results.heading')}</h1>
          <p className="text-muted-foreground">
            {filters.query
              ? t('results.countForQuery', { count: totalItems, query: filters.query })
              : t('results.count', { count: totalItems })}
          </p>
        </div>

        {/* Active filters chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {filter.label}
                <button
                  onClick={filter.onRemove}
                  className="ml-1 hover:text-primary/70"
                  aria-label={t('chips.remove')}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {activeFilters.length > 3 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                {t('chips.clearAll', { count: activeCount })}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filter sidebar */}
        <AdvancedFilterSidebarComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* Results Area */}
        <section className="flex-1 space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[200px]" aria-label={t('sort.label')}>
                  <SelectValue placeholder={t('sort.label')} />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`sort.options.${option.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              {t('results.showing', {
                from: totalItems > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0,
                to: Math.min(currentPage * ITEMS_PER_PAGE, totalItems),
                total: totalItems,
              })}
            </div>
          </div>

          {/* Results Grid */}
          {showLoadingState ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <EmptyState
                icon={<Search className="h-12 w-12 text-muted-foreground/50" />}
                title={t('results.emptyTitle')}
                description={filters.query ? t('results.emptyQuery') : t('results.emptyDefault')}
              />
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    {t('results.previous')}
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    {t('results.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
