'use client';

import { Eye, ShoppingCart } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Price } from '@/components/price';
import { CompareToggle } from '@/components/product-compare-toggle';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { Product } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useCartStore } from '@/stores/cart-store';

const ProductQuickView = dynamic(
  () => import('@/components/product-quick-view').then((mod) => mod.ProductQuickView),
  { ssr: false },
);

const blurPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const image = product.imageUrl || (product.images && product.images[0]) || '';
  const isOutOfStock = !product.inStock || product.stock <= 0;
  const hasDiscount =
    (product.discountPercent && product.discountPercent > 0) ||
    (product.originalPrice && product.originalPrice > product.price);
  const discountPct =
    product.discountPercent ??
    (product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null);

  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId } = useCartStore();
  const [showQuickView, setShowQuickView] = useState(false);

  const handleAddToCart = async () => {
    if (!cartId) {
      console.error('Failed to create cart: cartId not initialized on bootstrap');
      return;
    }
    mutate({
      productId: product.id,
      quantity: 1,
      name: product.title,
      price: { amount: product.price, currency: product.currency || 'IDR' },
      image: image,
      maxQuantity: product.stock,
      cartId,
    });
  };

  return (
    <>
      <div
        data-testid="product-card"
        className={cn(
          'group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-150 hover:border-primary/50 hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
          className,
        )}
      >
        {/* Product Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              placeholder="blur"
              blurDataURL={blurPlaceholder}
            />
          ) : null}

          {/* Discount Badge */}
          {hasDiscount && discountPct ? (
            <span className="shadow-xs absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
              -{discountPct}%
            </span>
          ) : null}

          {/* Actions top-right */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <FavToggle productId={product.id} size="sm" />
            <CompareToggle productId={product.id} size="sm" />
          </div>

          {/* Quick View on hover */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            onClick={() => setShowQuickView(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Lihat Cepat
          </Button>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Rating */}
          <Rating value={product.rating ?? 0} reviewCount={product.reviewCount ?? 0} />

          {/* Title */}
          <Link href={`/products/${product.slug}`} className="flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary">
              {product.title}
            </h3>
          </Link>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
            <div>
              {product.originalPrice && product.originalPrice > product.price ? (
                <div className="text-xs text-muted-foreground line-through">
                  <Price
                    amount={product.originalPrice}
                    currency={product.currency || 'IDR'}
                    locale="id-ID"
                    className="text-xs font-normal text-muted-foreground line-through"
                  />
                </div>
              ) : null}
              <Price
                amount={product.price}
                currency={product.currency || 'IDR'}
                locale="id-ID"
                className="text-base font-extrabold tracking-tight text-foreground"
              />
            </div>
            <GuardedButton
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              isLoading={isProductInFlight(product.id)}
              loadingLabel="..."
              className="shrink-0 gap-1.5 transition-transform duration-150 active:scale-[0.97]"
            >
              {isOutOfStock ? (
                'Habis'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Keranjang
                </>
              )}
            </GuardedButton>
          </div>
        </div>
      </div>

      {showQuickView ? (
        <ProductQuickView
          slug={product.slug}
          isOpen={showQuickView}
          onClose={() => setShowQuickView(false)}
        />
      ) : null}
    </>
  );
}
