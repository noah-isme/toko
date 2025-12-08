'use client';

import { useEffect } from 'react';

import { Price } from '@/components/price';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { Rating } from '@/components/rating';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { useProductQuery } from '@/lib/api/hooks';
import { normalizeError } from '@/shared/lib/normalizeError';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { ProductDetailSkeleton } from '@/shared/ui/skeletons/ProductDetailSkeleton';
import { useToast } from '@/shared/ui/toast';
import { withErrorBoundary } from '@/shared/ui/withErrorBoundary';

interface ProductDetailProps {
  slug: string;
}

function ProductDetailContent({ slug }: ProductDetailProps) {
  const { toast: pushToast } = useToast();
  const { data, isLoading, isFetching, error } = useProductQuery(slug);
  const { mutate, isProductInFlight } = useAddToCartMutation();

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
    mutate({
      productId: data.id,
      quantity: 1,
      name: data.name,
      price: data.price,
      image: data.images[0] ?? null,
      maxQuantity: data.inventory,
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <ProductImageGallery images={data.images} productName={data.name} />
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{data.name}</h1>
            <FavToggle productId={data.id} size="md" />
          </div>
          <Rating value={data.rating} reviewCount={data.reviewCount} className="mt-2" />
        </div>
        <Price amount={data.price.amount} currency={data.price.currency} className="text-2xl" />
        <p className="text-muted-foreground">{data.description}</p>
        <div className="space-y-2">
          <GuardedButton
            size="lg"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            isLoading={isProductInFlight(data.id)}
            loadingLabel="Menambahkan…"
          >
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </GuardedButton>
        </div>
      </div>
    </div>
  );
}

export const ProductDetail = withErrorBoundary(ProductDetailContent);
