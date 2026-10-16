'use client';

import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { Price } from '@/components/price';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductRecommendations } from '@/components/product-recommendations';
import { Rating } from '@/components/rating';
import { SocialShare } from '@/components/social-share';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { useProduct } from '@/entities/catalog/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
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
  const t = useTranslations('product.detail');
  const { toast: pushToast } = useToast();
  const { data, isLoading, isFetching, error } = useProduct(slug);
  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId } = useCartStore();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }

    pushToast({
      variant: 'destructive',
      title: t('loadErrorTitle'),
      description: normalizeError(error),
    });
  }, [error, pushToast, t]);

  if (isLoading || (!data && isFetching)) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(t('notFound'));
  }

  const variants = data.variants ?? [];
  const activeVariantId =
    selectedVariantId && variants.some((variant) => variant.id === selectedVariantId)
      ? selectedVariantId
      : (variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id ?? null);
  const selectedVariant = variants.find((variant) => variant.id === activeVariantId);
  const availableStock = selectedVariant?.stock ?? data.stock;
  const displayPrice = selectedVariant?.price ?? data.price;
  const isOutOfStock = !data.inStock || availableStock <= 0;

  const handleAddToCart = async () => {
    // Ensure cart exists before adding
    if (!cartId) {
      pushToast({
        variant: 'destructive',
        title: t('cartNotReady.title'),
        description: t('cartNotReady.description'),
      });
      return;
    }

    mutate({
      productId: data.id,
      variantId: activeVariantId,
      quantity: 1,
      name: data.title,
      price: { amount: displayPrice, currency: data.currency || 'IDR' },
      image: data.imageUrl || (data.images && data.images[0]) || null,
      maxQuantity: availableStock,
      cartId,
    });
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:gap-14">
        <div className="space-y-4">
          <ProductImageGallery
            images={data.imageUrl ? [data.imageUrl, ...(data.images || [])] : data.images || []}
            productName={data.title}
          />
          <div className="flex gap-2 text-sm text-muted-foreground">
            {data.categoryName && (
              <span className="rounded-full bg-muted px-3 py-1 capitalize text-foreground">
                {data.categoryName}
              </span>
            )}
          </div>
        </div>
        <div className="premium-surface h-fit space-y-6 rounded-[1.5rem] p-6 sm:p-8 lg:sticky lg:top-24">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1
                data-testid="product-title"
                className="font-display text-4xl leading-none text-foreground sm:text-5xl"
              >
                {data.title}
              </h1>
              <FavToggle productId={data.id} size="md" />
            </div>
            <Rating value={data.rating ?? 0} reviewCount={data.reviewCount ?? 0} className="mt-2" />
          </div>
          <Price
            data-testid="product-price"
            amount={displayPrice}
            currency={data.currency || 'IDR'}
            className="text-3xl font-extrabold"
          />
          <p className="leading-7 text-muted-foreground">{data.description}</p>
          <div className="grid grid-cols-2 gap-3 border-y border-border/80 py-4 text-xs">
            <p>
              <span className="block font-semibold text-foreground">
                {t('highlights.shippingTitle')}
              </span>
              <span className="text-muted-foreground">{t('highlights.shippingDescription')}</span>
            </p>
            <p>
              <span className="block font-semibold text-foreground">
                {t('highlights.paymentTitle')}
              </span>
              <span className="text-muted-foreground">{t('highlights.paymentDescription')}</span>
            </p>
          </div>
          <SocialShare
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={data.title}
            description={data.description}
            image={data.imageUrl || (data.images && data.images[0])}
          />
          {variants.length > 0 && (
            <div className="space-y-2" aria-label={t('variants.label')}>
              <p className="text-sm font-semibold">{t('variants.label')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {variants.map((variant) => {
                  const label =
                    Object.values(variant.attributes).join(' / ') || variant.sku || variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variant.stock <= 0}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                        activeVariantId === variant.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/60'
                      } ${variant.stock <= 0 ? 'cursor-not-allowed opacity-45' : ''}`}
                    >
                      <span className="block font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {variant.stock > 0
                          ? t('variants.available', { count: variant.stock })
                          : t('variants.soldOut')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <GuardedButton
              data-testid="add-to-cart"
              size="lg"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              isLoading={isProductInFlight(data.id, activeVariantId)}
              loadingLabel={t('adding')}
              className="w-full"
            >
              {isOutOfStock ? t('outOfStock') : t('addToCart')}
            </GuardedButton>
          </div>
        </div>
      </div>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
        <ProductRecommendations productId={data.id} />
      </Suspense>
    </>
  );
}

export const ProductDetail = withErrorBoundary(ProductDetailContent);
