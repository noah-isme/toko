'use client';

import { ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCartQuery } from '@/lib/api/hooks';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isFetching } = useCartQuery();
  const itemCount = data?.itemCount ?? 0;
  const isBusy = isLoading || (!data && isFetching);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const cartLabel = itemCount
    ? `Open cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
    : 'Open cart';

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button ref={triggerRef} aria-label={cartLabel} variant="ghost" className="relative gap-2">
          <ShoppingCart aria-hidden="true" className="h-5 w-5" />
          <span aria-hidden="true" className="sr-only sm:not-sr-only">
            Cart
          </span>
          {itemCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {itemCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="flex flex-1 flex-col gap-4"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (previousFocusRef.current ?? triggerRef.current)?.focus();
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <SheetHeader className="flex-1">
            <SheetTitle id={titleId}>Your cart</SheetTitle>
            <SheetDescription id={descriptionId}>
              Review the items in your shopping cart before checkout.
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <Button aria-label="Tutup" className="-mr-2 mt-1" size="icon" variant="ghost">
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {isBusy ? (
            <CartSkeleton items={3} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState {...emptyCart()} className="border-none bg-transparent" />
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
