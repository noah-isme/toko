'use client';

import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRelatedProductsQuery } from '@/lib/api/hooks';

export function RelatedProductList({ slug }: { slug: string }) {
  const { data, isLoading } = useRelatedProductsQuery(slug);

  if (isLoading) {
    return (
      <div className="space-y-6">
         <h2 className="text-2xl font-bold tracking-tight">You might also like</h2>
         <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">You might also like</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {data.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
