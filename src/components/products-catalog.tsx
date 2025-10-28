'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { FilterSidebar } from '@/components/filter-sidebar';
import { ProductCard } from '@/components/product-card';
import { useProductsQuery } from '@/lib/api/hooks';
import { useSearchStore } from '@/stores/search-store';

export function ProductsCatalog() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const searchTerm = useSearchStore((state) => state.term).toLowerCase();
  const { data, isLoading } = useProductsQuery();

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
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <FilterSidebar
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
      />
      <section className="flex-1">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Featured products</h1>
            <p className="text-sm text-muted-foreground">
              Discover curated items powered by our mock API integration.
            </p>
          </div>
        </header>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try adjusting your search or filter selections."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
