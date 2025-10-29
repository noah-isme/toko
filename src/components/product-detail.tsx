'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { Price } from '@/components/price';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation, useProductQuery } from '@/lib/api/hooks';
import { normalizeError } from '@/shared/lib/normalizeError';
import { ProductDetailSkeleton } from '@/shared/ui/skeletons/ProductDetailSkeleton';
import { useToast } from '@/shared/ui/toast';
import { withErrorBoundary } from '@/shared/ui/withErrorBoundary';

interface ProductDetailProps {
  slug: string;
}

function ProductDetailContent({ slug }: ProductDetailProps) {
  const { toast: pushToast } = useToast();
  const { data, isLoading, isFetching, error } = useProductQuery(slug);
  const { mutate, isPending, error: addToCartError } = useAddToCartMutation();

  useEffect(() => {
    if (!error) {
      return;
    }

    pushToast({
      variant: 'destructive',
      title: 'Gagal memuat produk',
      description: normalizeError(error),
    });
  }, [error, pushToast]);

  useEffect(() => {
    if (!addToCartError) {
      return;
    }

    pushToast({
      variant: 'destructive',
      title: 'Gagal menambahkan ke keranjang',
      description: normalizeError(addToCartError),
    });
  }, [addToCartError, pushToast]);

  if (isLoading || (!data && isFetching)) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Produk tidak ditemukan');
  }

  const isOutOfStock = data.inventory <= 0;

  const handleAddToCart = () => {
    mutate({ productId: data.id, quantity: 1 });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
          {data.images[0] ? (
            <Image
              src={data.images[0]}
              alt={data.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          ) : null}
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          {data.categories.map((category) => (
            <span key={category} className="rounded-full bg-muted px-3 py-1 capitalize">
              {category}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{data.name}</h1>
          <Rating value={data.rating} reviewCount={data.reviewCount} className="mt-2" />
        </div>
        <Price amount={data.price.amount} currency={data.price.currency} className="text-2xl" />
        <p className="text-muted-foreground">{data.description}</p>
        <div className="space-y-2">
          <Button size="lg" onClick={handleAddToCart} disabled={isPending || isOutOfStock}>
            {isOutOfStock ? 'Out of stock' : isPending ? 'Adding…' : 'Add to cart'}
          </Button>
          {addToCartError ? (
            <p className="text-sm text-destructive" role="status" aria-live="polite">
              {addToCartError.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const ProductDetail = withErrorBoundary(ProductDetailContent);
