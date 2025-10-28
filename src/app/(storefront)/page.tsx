"use client";

import Link from "next/link";
import { Loader2, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/empty-state";
import { FilterSidebar } from "@/components/widgets/filter-sidebar";
import { ProductCard } from "@/components/widgets/product-card";
import { useProductsQuery } from "@/lib/api/hooks";
import { useProductFiltersStore } from "@/stores/product-filters-store";

export default function StorefrontPage() {
  const search = useProductFiltersStore((state) => state.search);
  const { data: productsResponse, isLoading, isError, error } = useProductsQuery({ search });
  const products = (productsResponse?.data ?? []).map((item) => ({
    ...item,
    tags: item.tags ?? [],
  }));

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <FilterSidebar />
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Featured products</h1>
          <p className="text-sm text-muted-foreground">
            Browse our curated selection of products powered by the mock API. Switch to the real API
            by updating <code>.env</code> once your backend is ready.
          </p>
        </header>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Loading products...</span>
          </div>
        ) : isError ? (
          <EmptyState
            icon={<PackageSearch className="h-10 w-10" aria-hidden />}
            title="Unable to load products"
            description={error.message}
          />
        ) : products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-10 w-10" aria-hidden />}
            title="No products found"
            description="Try adjusting your filters or search term."
            className="bg-muted/40"
          />
        )}
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Looking for something else? Visit our{" "}
          <Button variant="link" asChild className="p-0 text-sm">
            <Link href="/account">account area</Link>
          </Button>{" "}
          to manage preferences.
        </div>
      </section>
    </div>
  );
}
