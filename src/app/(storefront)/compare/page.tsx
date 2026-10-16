'use client';

import { GitCompare, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Price } from '@/components/price';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { useCompareProducts } from '@/entities/compare/useCompareProducts';
import type { Product } from '@/lib/api';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useCompareStore } from '@/stores/compare-store';

type CompareTranslator = ReturnType<typeof useTranslations<'catalog.comparePage'>>;

interface CompareRow {
  labelKey: 'price' | 'rating' | 'brand' | 'category' | 'stock' | 'description';
  render: (product: Product, t: CompareTranslator) => React.ReactNode;
}

const rows: CompareRow[] = [
  {
    labelKey: 'price',
    render: (product) => (
      <Price
        amount={product.price}
        currency={product.currency || 'IDR'}
        className="text-base font-semibold text-foreground"
      />
    ),
  },
  {
    labelKey: 'rating',
    render: (product) =>
      typeof product.rating === 'number' ? (
        <Rating value={product.rating} reviewCount={product.reviewCount} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    labelKey: 'brand',
    render: (product) => product.brandName || <span className="text-muted-foreground">—</span>,
  },
  {
    labelKey: 'category',
    render: (product) => product.categoryName || <span className="text-muted-foreground">—</span>,
  },
  {
    labelKey: 'stock',
    render: (product, t) =>
      product.inStock && product.stock > 0 ? (
        <span className="text-emerald-600">{t('inStock', { count: product.stock })}</span>
      ) : (
        <span className="text-destructive">{t('outOfStock')}</span>
      ),
  },
  {
    labelKey: 'description',
    render: (product, t) => (
      <p className="line-clamp-4 text-sm text-muted-foreground">
        {product.description || t('noDescription')}
      </p>
    ),
  },
];

export default function ComparePage() {
  const t = useTranslations('catalog.comparePage');
  const { products, productIds, isLoading } = useCompareProducts();
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  if (productIds.length === 0) {
    return (
      <EmptyState
        icon={<GitCompare className="h-8 w-8" aria-hidden="true" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
        cta={{ label: t('browse'), href: '/products' }}
      />
    );
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('comparing', { count: products.length })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          {t('clear')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t('caption')}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-32 p-3 text-left align-bottom text-muted-foreground">
                {t('product')}
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
                          aria-label={t('remove', { title: product.title })}
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
              <tr key={row.labelKey} className="border-t">
                <th
                  scope="row"
                  className="p-3 text-left align-top font-medium text-muted-foreground"
                >
                  {t(`rows.${row.labelKey}`)}
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-3 align-top">
                    {row.render(product, t)}
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
