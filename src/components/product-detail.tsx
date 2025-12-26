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
import { useCartStore } from '@/stores/cart-store';

interface ProductDetailProps {
  slug: string;
}

function ProductDetailContent({ slug }: ProductDetailProps) {
  const { toast: pushToast } = useToast();
  const { data, isLoading, isFetching, error } = useProductQuery(slug);
  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId, initGuestCart } = useCartStore();

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

  // Use API Contract fields
  const isOutOfStock = !data.inStock || data.stock <= 0;

  const handleAddToCart = async () => {
    // Ensure cart exists before adding
    if (!cartId) {
      await initGuestCart();
    }

    // Get the latest cartId from store
    const currentCartId = useCartStore.getState().cartId;
    if (!currentCartId) {
      pushToast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Tidak dapat membuat keranjang',
      });
      return;
    }

    mutate({
      productId: data.id,
      quantity: 1,
      name: data.title,
      price: { amount: data.price, currency: data.currency || 'IDR' },
      image: data.imageUrl || (data.images && data.images[0]) || null,
      maxQuantity: data.stock,
      cartId: currentCartId,
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <ProductImageGallery
          images={data.imageUrl ? [data.imageUrl, ...(data.images || [])] : (data.images || [])}
          productName={data.title}
        />
        <div className="flex gap-2 text-sm text-muted-foreground">
          {data.categoryName && (
            <span className="rounded-full bg-muted px-3 py-1 capitalize">
              {data.categoryName}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{data.title}</h1>
            <FavToggle productId={data.id} size="md" />
          </div>
          <Rating value={data.rating ?? 0} reviewCount={data.reviewCount ?? 0} className="mt-2" />
        </div>
        <Price amount={data.price} currency={data.currency || 'IDR'} className="text-2xl" />
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
