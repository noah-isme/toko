import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { CompareToggle } from '@/components/product-compare-toggle';
import { useCompareStore } from '@/stores/compare-store';

describe('CompareToggle', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
    useCompareStore.setState({ productIds: [] });
  });

  it('adds the product to the comparison on click', () => {
    render(<CompareToggle productId="p1" />);
    const button = screen.getByRole('button', { name: /tambahkan ke perbandingan/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(useCompareStore.getState().productIds).toEqual(['p1']);
    expect(screen.getByRole('button', { name: /hapus dari perbandingan/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('removes the product when toggled off', () => {
    useCompareStore.setState({ productIds: ['p1'] });
    render(<CompareToggle productId="p1" />);

    fireEvent.click(screen.getByRole('button', { name: /hapus dari perbandingan/i }));
    expect(useCompareStore.getState().productIds).toEqual([]);
  });

  it('is disabled at the cap for products not already selected', () => {
    useCompareStore.setState({ productIds: ['a', 'b', 'c'] });
    render(<CompareToggle productId="p1" />);

    const button = screen.getByRole('button', { name: /maksimal 3 produk/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    // Click is a no-op while full.
    expect(useCompareStore.getState().productIds).toEqual(['a', 'b', 'c']);
  });

  it('remains enabled at the cap for an already-selected product', () => {
    useCompareStore.setState({ productIds: ['a', 'b', 'c'] });
    render(<CompareToggle productId="a" />);

    const button = screen.getByRole('button', { name: /hapus dari perbandingan/i });
    expect(button).not.toBeDisabled();
  });
});
