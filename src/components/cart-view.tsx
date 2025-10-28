'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { Price } from '@/components/price';
import { Button } from '@/components/ui/button';
import { useCartQuery } from '@/lib/api/hooks';

export function CartView() {
  const router = useRouter();
  const { data, isLoading } = useCartQuery();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add products to your cart to start checkout."
        action={{ label: 'Browse products', onClick: () => router.push('/') }}
      />
    );
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
