"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/widgets/empty-state";
import { QuantityPicker } from "@/components/widgets/quantity-picker";
import { formatCurrency } from "@/lib/utils";
import { useCartQuery } from "@/lib/api/hooks";
import { useCartStore } from "@/stores/cart-store";

export const CartDrawer = () => {
  const isOpen = useCartStore((state) => state.isOpen);
  const close = useCartStore((state) => state.close);
  const { data: cart, isLoading } = useCartQuery();
  const items = cart?.items ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="gap-0 border-l border-border p-0">
        <DialogHeader className="border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart className="h-5 w-5" /> Cart
          </DialogTitle>
          <DialogDescription>Your selected items</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Loading cart...</span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-10 w-10" aria-hidden />}
              title="Your cart is empty"
              description="Add products to your cart to start checkout."
            />
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  {item.product.imageUrl ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{item.product.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.product.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <QuantityPicker
                        value={item.quantity}
                        ariaLabel={`Quantity for ${item.product.name}`}
                      />
                      <span className="font-medium">
                        {formatCurrency(item.lineTotal.amount, item.lineTotal.currency)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter className="border-t border-border bg-muted/50">
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>
                {formatCurrency(cart?.subtotal.amount ?? 0, cart?.subtotal.currency ?? "USD")}
              </span>
            </div>
            <Button asChild className="w-full">
              <Link href="/checkout" onClick={close}>
                Go to Checkout
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
