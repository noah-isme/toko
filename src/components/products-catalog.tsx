'use client';

import { useMemo, useState } from 'react';

import { FilterSidebar } from '@/components/filter-sidebar';
import { Pagination } from '@/components/pagination';
import { ProductCard } from '@/components/product-card';
import { ProductSort, type SortOption } from '@/components/product-sort';
import { Button } from '@/components/ui/button';
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

    // Filter products
    const filtered = data.filter((product) => {
      const matchesSearch = searchTerm
        ? product.name.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm)
        : true;
      const matchesCategory =
        selectedCategories.length === 0 ||
        product.categories.some((category) => selectedCategories.includes(category));
      const productBrand = (product as any).brand || (product as any).brandName || '';
      const matchesBrand =
        selectedBrands.length === 0 || (productBrand && selectedBrands.includes(productBrand));
      const matchesPrice =
        product.price.amount >= priceRange[0] && product.price.amount <= priceRange[1];
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price.amount - b.price.amount;
        case 'price-desc':
          return b.price.amount - a.price.amount;
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
    () => (data ? data.flatMap((product) => product.categories) : []),
    [data],
  );

  const brands = useMemo(
    () =>
      data
        ? data
            .map((product) => (product as any).brand || (product as any).brandName)
            .filter(Boolean)
        : [],
    [data],
  ) as string[];

  const maxPrice = useMemo(() => {
    if (!data || data.length === 0) return 10000000;
    return Math.max(...data.map((p) => p.price.amount));
  }, [data]);

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
        priceRange={[0, maxPrice]}
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
