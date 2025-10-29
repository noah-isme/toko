import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { emptyCart, emptyOrders, emptyProducts } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';

describe('EmptyState component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title without optional props', () => {
    const { container } = render(<EmptyState title="Tidak ada data" />);

    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders description and CTA when provided', () => {
    render(
      <EmptyState
        title="Keranjang kosong"
        description="Tambahkan produk untuk melanjutkan."
        cta={{ label: 'Belanja', href: '/products' }}
      />,
    );

    expect(screen.getByText('Tambahkan produk untuk melanjutkan.')).toBeInTheDocument();
    const ctaLink = screen.getByRole('link', { name: 'Belanja' });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute('href', '/products');
  });
});

describe('Empty state presets', () => {
  const presets = [
    ['emptyProducts', emptyProducts],
    ['emptyCart', emptyCart],
    ['emptyOrders', emptyOrders],
  ] as const;

  it.each(presets)('%s provides title, description, and CTA', (_, preset) => {
    const props = preset();

    expect(props.title).toBeTruthy();
    expect(props.description).toBeTruthy();
    expect(props.cta?.label).toBeTruthy();
    expect(props.cta?.href).toBeTruthy();
  });
});
