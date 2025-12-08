'use client';

import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrands } from '@/lib/api';
import { cn } from '@/lib/utils';

export function BrandsSection() {
  const { data: brands, isLoading, error } = useBrands();

  if (error) return null;

  return (
    <section className="py-12">
      <Container>
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">Shop by Brand</h2>
          <p className="mt-2 text-muted-foreground">Discover products from your favorite brands</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : brands && brands.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/products?brand=${brand.slug}`}
                className={cn(
                  'group flex items-center justify-center rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              >
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="h-12 w-auto object-contain grayscale transition-all group-hover:grayscale-0"
                  />
                ) : (
                  <span className="text-center font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                    {brand.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
