"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/widgets/price";
import { Rating } from "@/components/widgets/rating";
import type { Product } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

export type ProductCardProps = {
  product: Product;
  className?: string;
};

export const ProductCard = ({ product, className }: ProductCardProps) => {
  const openCart = useCartStore((state) => state.open);

  return (
    <Card className={cn("group flex h-full flex-col", className)}>
      <CardHeader className="space-y-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 300px, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>
        <CardTitle className="text-lg font-semibold">
          <Link href={`/products/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>
        <Rating value={product.rating.average} count={product.rating.count} />
      </CardHeader>
      <CardContent className="flex-1 space-y-4 text-sm text-muted-foreground">
        <p>{product.description}</p>
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3">
        <Price
          amount={product.price.amount}
          currency={product.price.currency}
          className="text-lg font-semibold"
        />
        <div className="flex w-full items-center gap-2">
          <Button asChild className="flex-1">
            <Link href={`/products/${product.slug}`}>View details</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={openCart}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {product.inventory.isInStock ? `${product.inventory.available} in stock` : "Out of stock"}
        </p>
      </CardFooter>
    </Card>
  );
};
