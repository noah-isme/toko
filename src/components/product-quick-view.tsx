'use client';

import { X, ShoppingCart, Heart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { QuantityPicker } from '@/components/quantity-picker';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useProduct, useAddToCart, formatCurrency } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';


interface ProductQuickViewProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductQuickView({ slug, isOpen, onClose }: ProductQuickViewProps) {
  const { data: product, isLoading } = useProduct(slug, { enabled: isOpen });
  const [quantity, setQuantity] = useState(1);
  const { cartId, initGuestCart } = useCartStore();
  const addToCart = useAddToCart(cartId || '');
  const { toast } = useToast();

  const handleAddToCart = async () => {
    if (!cartId) {
      await initGuestCart();
    }

    if (!product) return;

    try {
      await addToCart.mutateAsync({
        productId: product.id,
        qty: quantity,
      });

      toast({
        title: 'Added to cart',
        description: `${product.title} has been added to your cart`,
      });

      setQuantity(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product to cart',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {isLoading ? (
          <div className="space-y-4">
            <DialogTitle className="sr-only">Loading product details</DialogTitle>
            <Skeleton className="h-8 w-3/4" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ) : product ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{product.title}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex flex-col space-y-4">
                {/* Rating */}
                {product.rating !== undefined && (
                  <Rating value={product.rating} reviewCount={product.reviewCount || 0} />
                )}

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                </div>

                {/* Stock Status */}
                <div>
                  {product.inStock && product.stock > 0 ? (
                    <span className="text-sm text-green-600">
                      In Stock ({product.stock} available)
                    </span>
                  ) : (
                    <span className="text-sm text-destructive">Out of Stock</span>
                  )}
                </div>

                {/* Description */}
                <p className="line-clamp-4 text-sm text-muted-foreground">{product.description || 'No description available'}</p>

                {/* Quantity & Actions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Quantity:</span>
                    <QuantityPicker
                      quantity={quantity}
                      onChange={setQuantity}
                      max={product.stock}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleAddToCart}
                      disabled={!product.inStock || product.stock === 0 || addToCart.isPending}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Add to wishlist">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* View Full Details Link */}
                <Link
                  href={`/products/${product.slug}`}
                  className="inline-flex items-center text-sm text-primary hover:underline"
                  onClick={onClose}
                >
                  View full details →
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <DialogTitle className="sr-only">Product not found</DialogTitle>
            Product not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
