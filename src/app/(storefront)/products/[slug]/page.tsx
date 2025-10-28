"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/empty-state";
import { Price } from "@/components/widgets/price";
import { QuantityPicker } from "@/components/widgets/quantity-picker";
import { Rating } from "@/components/widgets/rating";
import { useProductQuery } from "@/lib/api/hooks";
import { useCartStore } from "@/stores/cart-store";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const openCart = useCartStore((state) => state.open);
  const slug = params?.slug;
  const { data: product, isLoading, isError, error } = useProductQuery(slug);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading product...
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        title="Product not found"
        description={error?.message ?? "We couldn't find the product you're looking for."}
        icon={<ArrowLeft className="h-10 w-10" aria-hidden />}
        className="bg-muted/50"
      />
    );
  }

  return (
    <article className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to catalog
        </Link>
        <div className="relative aspect-square overflow-hidden rounded-xl border">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 400px, 60vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <Rating value={product.rating.average} count={product.rating.count} />
          <Price
            amount={product.price.amount}
            currency={product.price.currency}
            className="text-2xl font-semibold"
          />
        </header>
        <p className="text-muted-foreground">{product.description}</p>
        <div className="flex items-center gap-4">
          <QuantityPicker value={1} ariaLabel={`Quantity for ${product.name}`} />
          <Button size="lg" onClick={openCart}>
            Add to cart
          </Button>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Highlights
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {(product.tags ?? []).map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Inventory status:{" "}
          {product.inventory.isInStock
            ? `${product.inventory.available} items available`
            : "Out of stock"}
        </div>
      </div>
    </article>
  );
}
