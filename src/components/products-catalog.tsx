'use client';

import { useMemo, useState } from 'react';

import { FilterSidebar } from '@/components/filter-sidebar';
import { Pagination } from '@/components/pagination';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useProductsQuery } from '@/lib/api/hooks';
import { emptyProducts } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';
import { useSearchStore } from '@/stores/search-store';

const ITEMS_PER_PAGE = 12;

export function ProductsCatalog() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTerm = useSearchStore((state) => state.term).toLowerCase();
  const { data, isLoading, isFetching, error } = useProductsQuery();
  const showLoadingState = isLoading || (!data && isFetching);

  const filteredProducts = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.filter((product) => {
      const matchesSearch = searchTerm
        ? product.name.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm)
        : true;
      const matchesCategory =
        selectedCategories.length === 0 ||
        product.categories.some((category) => selectedCategories.includes(category));
      return matchesSearch && matchesCategory;
    });
  }, [data, searchTerm, selectedCategories]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const categories = useMemo(
    () => (data ? data.flatMap((product) => product.categories) : []),
    [data],
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
    setCurrentPage(1); // Reset to first page when filter changes
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
      />
      <section className="flex-1 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Featured products</h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} products available
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
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
        ) : filteredProducts.length === 0 ? (
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
