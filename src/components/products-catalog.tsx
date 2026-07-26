'use client';

import { FolderOpen, Package, SearchX } from 'lucide-react';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Pagination } from '@/components/pagination';
import { ProductCard } from '@/components/product-card';
import type { SortOption } from '@/components/product-sort';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/lib/api';
import { formatCurrency } from '@/lib/api/utils';
import {
  emptyCategoryProducts,
  emptyProducts,
  emptySearchResults,
} from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';
import { useSearchStore } from '@/stores/search-store';

const FilterSidebar = dynamic(
  () => import('@/components/filter-sidebar').then((mod) => mod.FilterSidebar),
  {
    ssr: false,
    loading: () => (
      <div className="hidden h-screen w-64 shrink-0 rounded-xl border bg-card lg:block" />
    ),
  },
);

const ProductSort = dynamic(
  () => import('@/components/product-sort').then((mod) => mod.ProductSort),
  {
    ssr: false,
    loading: () => <div className="h-10 w-[200px] rounded-md border bg-card" />,
  },
);

const ITEMS_PER_PAGE = 12;

export function ProductsCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const syncFromParamsRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasPriceParamRef = useRef(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const searchTermValue = useSearchStore((state) => state.term);
  const setSearchTerm = useSearchStore((state) => state.setTerm);
  const searchTermRaw = searchTermValue.trim();
  const searchTerm = searchTermRaw.toLowerCase();
  const { data: rawProductsData, isLoading, isFetching, error, refetch } = useProducts();
  const data = rawProductsData?.data;
  const showLoadingState = isLoading || (!data && isFetching);

  const normalizeFacet = useCallback((value: string) => value.trim().toLowerCase(), []);
  const normalizedCategorySelections = useMemo(
    () => selectedCategories.map(normalizeFacet),
    [normalizeFacet, selectedCategories],
  );
  const normalizedBrandSelections = useMemo(
    () => selectedBrands.map(normalizeFacet),
    [normalizeFacet, selectedBrands],
  );

  const filteredAndSortedProducts = useMemo(() => {
    if (!data) {
      return [];
    }

    // Filter products (using API Contract fields)
    const filtered = data.filter((product) => {
      const matchesSearch = searchTerm
        ? product.title.toLowerCase().includes(searchTerm) ||
          (product.description?.toLowerCase().includes(searchTerm) ?? false)
        : true;
      const categoryMatchValue = normalizeFacet(product.categoryName ?? '');
      const categoryIdValue = normalizeFacet(product.categoryId ?? '');
      const matchesCategory =
        normalizedCategorySelections.length === 0 ||
        normalizedCategorySelections.includes(categoryIdValue) ||
        normalizedCategorySelections.includes(categoryMatchValue);
      const brandMatchValue = normalizeFacet(product.brandName ?? '');
      const brandIdValue = normalizeFacet(product.brandId ?? '');
      const matchesBrand =
        normalizedBrandSelections.length === 0 ||
        normalizedBrandSelections.includes(brandIdValue) ||
        normalizedBrandSelections.includes(brandMatchValue);
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesRating = !ratingFilter || (product.rating ?? 0) >= ratingFilter;
      const matchesStock = !inStockOnly || product.inStock || product.stock > 0;
      const hasDiscount =
        (product.discountPercent && product.discountPercent > 0) ||
        (product.originalPrice && product.originalPrice > product.price);
      const matchesDiscount = !discountOnly || hasDiscount;
      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesPrice &&
        matchesRating &&
        matchesStock &&
        matchesDiscount
      );
    });

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
        default:
          return 0; // Keep original order (assuming API returns newest first)
      }
    });

    return sorted;
  }, [
    data,
    discountOnly,
    inStockOnly,
    normalizeFacet,
    normalizedBrandSelections,
    normalizedCategorySelections,
    priceRange,
    ratingFilter,
    searchTerm,
    sortBy,
  ]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);

  const categories = useMemo(
    () => (data ? [...new Set(data.map((product) => product.categoryName).filter(Boolean))] : []),
    [data],
  ) as string[];

  const brands = useMemo(
    () => (data ? [...new Set(data.map((product) => product.brandName).filter(Boolean))] : []),
    [data],
  ) as string[];

  const maxPrice = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map((p) => p.price));
  }, [data]);

  const priceRangeDefaults = useMemo<[number, number]>(() => [0, maxPrice || 10000000], [maxPrice]);

  const isPriceRangeActive =
    priceRange[0] !== priceRangeDefaults[0] || priceRange[1] !== priceRangeDefaults[1];

  // Effect to update local price range when data (and thus maxPrice) loads for the first time
  useEffect(() => {
    if (!hasPriceParamRef.current && maxPrice > 0 && priceRange[1] === 10000000) {
      // Initialize the price range once the product data (and derived maxPrice) loads.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriceRange([0, maxPrice]);
    }
  }, [maxPrice, priceRange]);

  useEffect(() => {
    if (syncFromParamsRef.current) {
      syncFromParamsRef.current = false;
      return;
    }
    // Reset to the first page whenever the user changes the search term (not on URL-driven sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const parseList = (value: string | null) =>
      value
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const parseNumber = (value: string | null) => {
      if (!value) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const parseBoolean = (value: string | null) => value === '1' || value === 'true';

    const query = params.get('q') ?? '';
    const categoryParams = parseList(params.get('categories'));
    const brandParams = parseList(params.get('brands'));
    const ratingParam = parseNumber(params.get('rating'));
    const minPriceParam = parseNumber(params.get('minPrice'));
    const maxPriceParam = parseNumber(params.get('maxPrice'));
    const pageParam = parseNumber(params.get('page'));
    const sortParam = params.get('sort') as SortOption | null;

    hasPriceParamRef.current = minPriceParam !== null || maxPriceParam !== null;
    syncFromParamsRef.current = true;

    const areArraysEqual = (a: any[], b: any[]) =>
      a.length === b.length && a.every((val, index) => val === b[index]);

    if (searchTermValue !== query) {
      setSearchTerm(query);
    }

    const nextCategories = categoryParams.length
      ? categoryParams.map((value) => {
          const match = categories.find(
            (option) => normalizeFacet(option) === normalizeFacet(value),
          );
          return match ?? value;
        })
      : [];
    // This effect syncs component state from the URL query string (external state);
    // the guarded setters below only fire when the derived value actually changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategories((curr) => (areArraysEqual(curr, nextCategories) ? curr : nextCategories));

    const nextBrands = brandParams.length
      ? brandParams.map((value) => {
          const match = brands.find((option) => normalizeFacet(option) === normalizeFacet(value));
          return match ?? value;
        })
      : [];
    setSelectedBrands((curr) => (areArraysEqual(curr, nextBrands) ? curr : nextBrands));

    const nextRating = ratingParam && [2, 3, 4].includes(ratingParam) ? ratingParam : null;
    setRatingFilter((curr) => (curr === nextRating ? curr : nextRating));

    const nextInStock = parseBoolean(params.get('inStock'));
    setInStockOnly((curr) => (curr === nextInStock ? curr : nextInStock));

    const nextDiscount = parseBoolean(params.get('discount'));
    setDiscountOnly((curr) => (curr === nextDiscount ? curr : nextDiscount));

    const nextMin = minPriceParam ?? priceRangeDefaults[0];
    const nextMax = maxPriceParam ?? priceRangeDefaults[1];
    const nextPriceRange: [number, number] = [nextMin, nextMax];
    setPriceRange((curr) => (areArraysEqual(curr, nextPriceRange) ? curr : nextPriceRange));

    const nextSort =
      sortParam &&
      ['name-asc', 'name-desc', 'price-asc', 'price-desc', 'newest', 'rating'].includes(sortParam)
        ? sortParam
        : 'newest';
    setSortBy((curr) => (curr === nextSort ? curr : nextSort));

    const nextPage = pageParam && pageParam > 0 ? pageParam : 1;
    setCurrentPage((curr) => (curr === nextPage ? curr : nextPage));

    hasInitializedRef.current = true;
  }, [
    brands,
    categories,
    normalizeFacet,
    priceRangeDefaults,
    searchParamsString,
    setSearchTerm,
    searchTermValue,
  ]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }
    if (syncFromParamsRef.current) {
      syncFromParamsRef.current = false;
      return;
    }

    const params = new URLSearchParams();

    if (searchTermRaw) params.set('q', searchTermRaw);
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','));
    if (selectedBrands.length) params.set('brands', selectedBrands.join(','));
    if (ratingFilter) params.set('rating', String(ratingFilter));
    if (inStockOnly) params.set('inStock', '1');
    if (discountOnly) params.set('discount', '1');
    if (isPriceRangeActive) {
      params.set('minPrice', String(priceRange[0]));
      params.set('maxPrice', String(priceRange[1]));
    }
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));

    const nextQuery = params.toString();
    if (nextQuery === searchParamsString) {
      return;
    }

    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(target as Route);
  }, [
    currentPage,
    discountOnly,
    inStockOnly,
    isPriceRangeActive,
    pathname,
    priceRange,
    ratingFilter,
    router,
    searchParamsString,
    searchTermRaw,
    selectedBrands,
    selectedCategories,
    sortBy,
  ]);

  const hasActiveFilters =
    searchTerm.length > 0 ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    ratingFilter !== null ||
    inStockOnly ||
    discountOnly ||
    isPriceRangeActive;

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setRatingFilter(null);
    setInStockOnly(false);
    setDiscountOnly(false);
    setPriceRange(priceRangeDefaults);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
    setCurrentPage(1);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand],
    );
    setCurrentPage(1);
  };

  const handlePriceRangeChange = (value: [number, number]) => {
    setPriceRange(value);
    setCurrentPage(1);
  };

  const handleRatingChange = (value: number | null) => {
    setRatingFilter(value);
    setCurrentPage(1);
  };

  const handleInStockToggle = (value: boolean) => {
    setInStockOnly(value);
    setCurrentPage(1);
  };

  const handleDiscountToggle = (value: boolean) => {
    setDiscountOnly(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

    if (searchTerm.length > 0) {
      chips.push({
        id: 'search',
        label: `Pencarian: ${searchTermRaw}`,
        onRemove: () => {
          setSearchTerm('');
          setCurrentPage(1);
        },
      });
    }

    selectedCategories.forEach((category) => {
      chips.push({
        id: `category-${category}`,
        label: category,
        onRemove: () => {
          setSelectedCategories((current) => current.filter((item) => item !== category));
          setCurrentPage(1);
        },
      });
    });

    selectedBrands.forEach((brand) => {
      chips.push({
        id: `brand-${brand}`,
        label: brand,
        onRemove: () => {
          setSelectedBrands((current) => current.filter((item) => item !== brand));
          setCurrentPage(1);
        },
      });
    });

    if (ratingFilter) {
      chips.push({
        id: `rating-${ratingFilter}`,
        label: `Rating ${ratingFilter}+ bintang`,
        onRemove: () => {
          setRatingFilter(null);
          setCurrentPage(1);
        },
      });
    }

    if (inStockOnly) {
      chips.push({
        id: 'in-stock',
        label: 'Stok tersedia',
        onRemove: () => {
          setInStockOnly(false);
          setCurrentPage(1);
        },
      });
    }

    if (discountOnly) {
      chips.push({
        id: 'discount',
        label: 'Promo',
        onRemove: () => {
          setDiscountOnly(false);
          setCurrentPage(1);
        },
      });
    }

    if (isPriceRangeActive) {
      chips.push({
        id: 'price-range',
        label: `Harga ${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`,
        onRemove: () => {
          setPriceRange(priceRangeDefaults);
          setCurrentPage(1);
        },
      });
    }

    return chips;
  }, [
    discountOnly,
    inStockOnly,
    isPriceRangeActive,
    priceRange,
    priceRangeDefaults,
    ratingFilter,
    searchTermRaw,
    searchTerm,
    selectedBrands,
    selectedCategories,
    setSearchTerm,
  ]);

  const emptyState = useMemo(() => {
    if (searchTerm.length > 0) {
      return emptySearchResults(searchTermRaw);
    }
    if (selectedCategories.length > 0) {
      return emptyCategoryProducts(selectedCategories);
    }
    return emptyProducts();
  }, [searchTerm, searchTermRaw, selectedCategories]);

  const emptyStateIcon = useMemo(() => {
    if (searchTerm.length > 0) {
      return <SearchX aria-hidden="true" />;
    }
    if (selectedCategories.length > 0) {
      return <FolderOpen aria-hidden="true" />;
    }
    return <Package aria-hidden="true" />;
  }, [searchTerm, selectedCategories]);

  return (
    <PullToRefresh onRefresh={refetch} className="flex flex-col gap-6 lg:flex-row">
      <FilterSidebar
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        brands={brands}
        selectedBrands={selectedBrands}
        onToggleBrand={toggleBrand}
        priceRange={[0, maxPrice || 10000000]}
        priceRangeValue={priceRange}
        onPriceRangeChange={handlePriceRangeChange}
        ratingFilter={ratingFilter}
        onRatingChange={handleRatingChange}
        inStockOnly={inStockOnly}
        onToggleInStock={handleInStockToggle}
        discountOnly={discountOnly}
        onToggleDiscount={handleDiscountToggle}
        onClearFilters={clearFilters}
      />
      <section className="flex-1 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Featured products</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedProducts.length} products available
              {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <ProductSort value={sortBy} onChange={handleSortChange} />
        </header>
        {filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                onClick={chip.onRemove}
              >
                <span>{chip.label}</span>
                <span className="text-xs text-muted-foreground group-hover:text-primary">×</span>
              </button>
            ))}
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            ) : null}
          </div>
        ) : null}
        {showLoadingState ? (
          <ProductCardSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 px-6 py-16 text-center">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Failed to load products</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Please try again later
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="space-y-4">
            <EmptyState icon={emptyStateIcon} {...emptyState} />
            {hasActiveFilters ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={clearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="list">
              {paginatedProducts.map((product) => (
                <li key={product.id} className="list-none">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>
    </PullToRefresh>
  );
}
