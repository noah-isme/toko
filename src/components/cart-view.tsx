'use client';

import Link from 'next/link';

import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useCartQuery } from '@/lib/api/hooks';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';

export function CartView() {
  const { data, isLoading, isFetching } = useCartQuery();
  const isBusy = isLoading || (!data && isFetching);

  if (isBusy) {
    return <CartSkeleton />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState {...emptyCart()} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shopping cart</h1>
      <ul className="space-y-4">
        {data.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
            </div>
            <Price amount={item.price.amount * item.quantity} currency={item.price.currency} />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <Price
          amount={data.subtotal.amount}
          currency={data.subtotal.currency}
          className="text-lg"
        />
      </div>
      <Button asChild size="lg">
        <Link href="/checkout">Proceed to checkout</Link>
      </Button>
    </div>
  );
}
