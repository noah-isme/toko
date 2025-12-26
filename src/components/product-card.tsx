'use client';

import { Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Price } from '@/components/price';
import { ProductQuickView } from '@/components/product-quick-view';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { Product } from '@/lib/api/schemas';
import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useCartStore } from '@/stores/cart-store';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  // Use API Contract fields: imageUrl (primary), title, price, stock, inStock
  const image = product.imageUrl || (product.images && product.images[0]) || '';
  const isOutOfStock = !product.inStock || product.stock <= 0;

  const { mutate, isProductInFlight } = useAddToCartMutation();
  const { cartId, initGuestCart } = useCartStore();
  const [showQuickView, setShowQuickView] = useState(false);

  const handleAddToCart = async () => {
    // Ensure cart exists before adding
    if (!cartId) {
      await initGuestCart();
    }

    // Get the latest cartId from store (may have been set by initGuestCart)
    const currentCartId = useCartStore.getState().cartId;

    if (!currentCartId) {
      console.error('Failed to create cart');
      return;
    }

    const payload = {
      productId: product.id,
      quantity: 1,
      name: product.title,
      price: { amount: product.price, currency: product.currency || 'IDR' },
      image: image,
      maxQuantity: product.stock,
      cartId: currentCartId,
    };

    mutate(payload);
  };

  return (
    <>
      <Card
        className={cn(
          'flex flex-col focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
          className,
        )}
      >
        <CardHeader className="space-y-3">
          <div className="group relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
            {image ? (
              <Image
                src={image}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
            ) : null}
            <div className="absolute right-2 top-2">
              <FavToggle productId={product.id} size="sm" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => setShowQuickView(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Quick View
            </Button>
          </div>
          <CardTitle className="line-clamp-2 text-base">{product.title}</CardTitle>
          <Rating value={product.rating ?? 0} reviewCount={product.reviewCount ?? 0} />
        </CardHeader>
        <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
          <p className="line-clamp-3">{product.description || 'No description available'}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Price
            amount={product.price}
            currency={product.currency || 'IDR'}
            className="text-lg"
          />
          <div className="flex flex-col gap-2">
            <GuardedButton
              variant="secondary"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              isLoading={isProductInFlight(product.id)}
              loadingLabel="Menambahkan…"
            >
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </GuardedButton>
            <Button asChild>
              <Link href={`/products/${product.slug}`}>View details</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
      <ProductQuickView
        slug={product.slug}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </>
  );
}
