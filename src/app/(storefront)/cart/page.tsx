"use client";

import Link from "next/link";
import { Loader2, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/empty-state";
import { Price } from "@/components/widgets/price";
import { useCartQuery } from "@/lib/api/hooks";

export default function CartPage() {
  const { data: cart, isLoading } = useCartQuery();
  const items = cart?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the catalog and add products to your cart."
        icon={<PackageSearch className="h-10 w-10" aria-hidden />}
      />
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Shopping cart</h1>
        <p className="text-sm text-muted-foreground">Review your selections before checkout.</p>
      </header>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold">{item.product.name}</h2>
              <p className="text-sm text-muted-foreground">{item.product.description}</p>
              <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
            </div>
            <Price
              amount={item.lineTotal.amount}
              currency={item.lineTotal.currency}
              className="text-lg font-semibold"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
        <Price
          amount={cart?.subtotal.amount ?? 0}
          currency={cart?.subtotal.currency ?? "USD"}
          className="text-xl font-semibold"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </section>
  );
}
