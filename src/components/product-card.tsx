'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Price } from '@/components/price';
import { Rating } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddToCartMutation } from '@/entities/cart/hooks';
import { FavToggle } from '@/entities/favorites/ui/FavToggle';
import { Product } from '@/lib/api/schemas';
import { cn } from '@/lib/utils';
import { GuardedButton } from '@/shared/ui/GuardedButton';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const image = product.images[0];
  const { mutate, isProductInFlight } = useAddToCartMutation();
  const isOutOfStock = product.inventory <= 0;

  const handleAddToCart = () => {
    mutate({
      productId: product.id,
      quantity: 1,
      name: product.name,
      price: product.price,
      image: product.images[0] ?? null,
      maxQuantity: product.inventory,
    });
  };

  return (
    <Card
      className={cn(
        'flex flex-col focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
        className,
      )}
    >
      <CardHeader className="space-y-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 33vw, 100vw"
            />
          ) : null}
          <div className="absolute right-2 top-2">
            <FavToggle productId={product.id} size="sm" />
          </div>
        </div>
        <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
        <Rating value={product.rating} reviewCount={product.reviewCount} />
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
        <p className="line-clamp-3">{product.description}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Price
          amount={product.price.amount}
          currency={product.price.currency}
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
  );
}
