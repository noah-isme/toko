'use client';

import { Loader2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCartQuery } from '@/lib/api/hooks';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCartQuery();
  const itemCount = data?.itemCount ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Cart</span>
          {itemCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {itemCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-1 flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Browse products and add them to your cart."
            />
          ) : (
            <ul className="space-y-3">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <Price
                    amount={item.price.amount * item.quantity}
                    currency={item.price.currency}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <SheetFooter>
          {data ? (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <Price amount={data.subtotal.amount} currency={data.subtotal.currency} />
              </div>
              <Button asChild className="w-full">
                <Link href="/checkout" onClick={() => setOpen(false)}>
                  Go to checkout
                </Link>
              </Button>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
