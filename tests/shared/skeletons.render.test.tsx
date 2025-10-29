import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { CartSkeleton } from '@/shared/ui/skeletons/CartSkeleton';
import { CheckoutSkeleton } from '@/shared/ui/skeletons/CheckoutSkeleton';
import { OrdersTableSkeleton } from '@/shared/ui/skeletons/OrdersTableSkeleton';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';
import { ProductDetailSkeleton } from '@/shared/ui/skeletons/ProductDetailSkeleton';

type SkeletonCase = {
  name: string;
  renderCase: () => ReturnType<typeof render>;
};

const skeletonCases: SkeletonCase[] = [
  {
    name: 'ProductCardSkeleton',
    renderCase: () => render(<ProductCardSkeleton count={2} />),
  },
  {
    name: 'ProductDetailSkeleton',
    renderCase: () => render(<ProductDetailSkeleton />),
  },
  {
    name: 'CartSkeleton',
    renderCase: () => render(<CartSkeleton items={3} />),
  },
  {
    name: 'CheckoutSkeleton',
    renderCase: () => render(<CheckoutSkeleton />),
  },
  {
    name: 'OrdersTableSkeleton',
    renderCase: () => render(<OrdersTableSkeleton rows={4} />),
  },
];

describe('Skeleton accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(skeletonCases)('%s renders loading role with sr-only text', ({ renderCase }) => {
    const { container } = renderCase();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Memuat...')).toHaveClass('sr-only');
    expect(container.firstChild).toMatchSnapshot();
  });
});
