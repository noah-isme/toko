'use client';

import { GitCompare, X } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useCompareProducts } from '@/entities/compare/useCompareProducts';
import { MAX_COMPARE_ITEMS, useCompareStore } from '@/stores/compare-store';

/**
 * Floating action bar summarising the current comparison selection. Hidden when
 * nothing is selected; links to the /compare matrix once at least one product
 * is chosen.
 */
export function CompareBar() {
  const { products } = useCompareProducts();
  const productIds = useCompareStore((state) => state.productIds);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  // Nothing selected → render nothing (avoids occupying layout space).
  if (productIds.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <GitCompare className="h-4 w-4" aria-hidden="true" />
          <span>
            Bandingkan{' '}
            <span className="text-foreground">
              {productIds.length}/{MAX_COMPARE_ITEMS}
            </span>
          </span>
        </div>

        <ul className="flex flex-1 flex-wrap items-center gap-2">
          {products.map((product) => {
            const image = product.imageUrl || product.images?.[0] || '';
            return (
              <li key={product.id} className="relative">
                <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  aria-label={`Hapus ${product.title} dari perbandingan`}
                  className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Hapus semua
          </Button>
          {productIds.length < 2 ? (
            <Button
              type="button"
              size="sm"
              disabled
              title="Pilih minimal 2 produk untuk dibandingkan"
            >
              Bandingkan
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={'/compare' as Route}>Bandingkan</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
