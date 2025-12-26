'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { Pagination } from '@/components/pagination';
import { ProductCard } from '@/components/product-card';
import type { SortOption } from '@/components/product-sort';
import { Button } from '@/components/ui/button';

const FilterSidebar = dynamic(() => import('@/components/filter-sidebar').then(mod => mod.FilterSidebar), {
  ssr: false,
  loading: () => <div className="hidden h-screen w-64 shrink-0 rounded-xl border bg-card lg:block" />,
});

const ProductSort = dynamic(() => import('@/components/product-sort').then(mod => mod.ProductSort), {
  ssr: false,
  loading: () => <div className="h-10 w-[200px] rounded-md border bg-card" />,
});
import { useProductsQuery } from '@/lib/api/hooks';
import { emptyProducts } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';
import { useSearchStore } from '@/stores/search-store';

const ITEMS_PER_PAGE = 12;

export function ProductsCatalog() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const searchTerm = useSearchStore((state) => state.term).toLowerCase();
  const { data, isLoading, isFetching, error } = useProductsQuery();
  const showLoadingState = isLoading || (!data && isFetching);

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
      const matchesCategory =
        selectedCategories.length === 0 ||
        (product.categoryId && selectedCategories.includes(product.categoryId)) ||
        (product.categoryName && selectedCategories.includes(product.categoryName.toLowerCase()));
      const matchesBrand =
        selectedBrands.length === 0 ||
        (product.brandId && selectedBrands.includes(product.brandId)) ||
        (product.brandName && selectedBrands.includes(product.brandName.toLowerCase()));
      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
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
  }, [data, searchTerm, selectedCategories, selectedBrands, priceRange, sortBy]);

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
    () =>
      data
        ? [...new Set(data.map((product) => product.brandName).filter(Boolean))]
        : [],
    [data],
  ) as string[];

  const maxPrice = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map((p) => p.price));
  }, [data]);

  // Effect to update local price range when data (and thus maxPrice) loads for the first time
  useEffect(() => {
    if (maxPrice > 0 && priceRange[1] === 10000000) {
      setPriceRange([0, maxPrice]);
    }
  }, [maxPrice]);


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

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
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
      />
      <section className="flex-1 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Featured products</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedProducts.length} products available
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <ProductSort value={sortBy} onChange={handleSortChange} />
        </header>
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
          <EmptyState {...emptyProducts()} />
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
    </div>
  );
}
