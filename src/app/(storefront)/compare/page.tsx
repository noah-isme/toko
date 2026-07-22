'use client';

import { GitCompare, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Price } from '@/components/price';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { useCompareProducts } from '@/entities/compare/useCompareProducts';
import type { Product } from '@/lib/api';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useCompareStore } from '@/stores/compare-store';

interface CompareRow {
  label: string;
  render: (product: Product) => React.ReactNode;
}

const rows: CompareRow[] = [
  {
    label: 'Harga',
    render: (product) => (
      <Price
        amount={product.price}
        currency={product.currency || 'IDR'}
        className="text-base font-semibold text-foreground"
      />
    ),
  },
  {
    label: 'Rating',
    render: (product) =>
      typeof product.rating === 'number' ? (
        <Rating value={product.rating} reviewCount={product.reviewCount} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    label: 'Brand',
    render: (product) => product.brandName || <span className="text-muted-foreground">—</span>,
  },
  {
    label: 'Kategori',
    render: (product) => product.categoryName || <span className="text-muted-foreground">—</span>,
  },
  {
    label: 'Stok',
    render: (product) =>
      product.inStock && product.stock > 0 ? (
        <span className="text-emerald-600">Tersedia ({product.stock})</span>
      ) : (
        <span className="text-destructive">Habis</span>
      ),
  },
  {
    label: 'Deskripsi',
    render: (product) => (
      <p className="line-clamp-4 text-sm text-muted-foreground">
        {product.description || 'Tidak ada deskripsi.'}
      </p>
    ),
  },
];

export default function ComparePage() {
  const { products, productIds, isLoading } = useCompareProducts();
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  if (productIds.length === 0) {
    return (
      <EmptyState
        icon={<GitCompare className="h-8 w-8" aria-hidden="true" />}
        title="Belum ada produk untuk dibandingkan"
        description="Pilih hingga 3 produk dari katalog untuk melihat perbandingan berdampingan."
        cta={{ label: 'Jelajahi produk', href: '/products' }}
      />
    );
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Perbandingan Produk</h1>
        <p className="text-sm text-muted-foreground">Memuat produk…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Perbandingan Produk</h1>
          <p className="text-sm text-muted-foreground">
            Membandingkan {products.length} produk berdampingan.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Kosongkan perbandingan
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Tabel perbandingan produk</caption>
          <thead>
            <tr>
              <th scope="col" className="w-32 p-3 text-left align-bottom text-muted-foreground">
                Produk
              </th>
              {products.map((product) => {
                const image = product.imageUrl || product.images?.[0] || '';
                return (
                  <th key={product.id} scope="col" className="p-3 align-top">
                    <div className="space-y-3">
                      <div className="relative mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-lg border bg-muted">
                        {image ? (
                          <Image
                            src={image}
                            alt={product.title}
                            fill
                            sizes="160px"
                            className="object-cover"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          aria-label={`Hapus ${product.title} dari perbandingan`}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <Link
                        href={`/products/${product.slug}`}
                        className="line-clamp-2 block text-center font-medium text-foreground hover:underline"
                      >
                        {product.title}
                      </Link>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t">
                <th
                  scope="row"
                  className="p-3 text-left align-top font-medium text-muted-foreground"
                >
                  {row.label}
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-3 align-top">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
