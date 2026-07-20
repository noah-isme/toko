import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderSummary } from '@/app/(storefront)/checkout/_components/OrderSummary';

// The tax label is derived from the server-sent amounts (tax / taxable base) so it
// stays honest if the backend rate changes. These cases lock the derivation.
describe('OrderSummary tax label', () => {
  it('shows the standard 11% rate when tax matches an 11% base', () => {
    render(
      <OrderSummary
        totals={{ subtotal: 200000, discount: 0, tax: 22000, shipping: 0, total: 222000 }}
      />,
    );
    expect(screen.getByText('Tax (11%)')).toBeInTheDocument();
  });

  it('derives a non-11% rate from the amounts (proves the rate is not hardcoded)', () => {
    render(
      <OrderSummary
        totals={{ subtotal: 200000, discount: 0, tax: 30000, shipping: 0, total: 230000 }}
      />,
    );
    expect(screen.getByText('Tax (15%)')).toBeInTheDocument();
    expect(screen.queryByText('Tax (11%)')).not.toBeInTheDocument();
  });

  it('computes the rate on the post-discount taxable base', () => {
    // taxable = 200000 - 100000 = 100000; tax 11000 => 11%
    render(
      <OrderSummary
        totals={{ subtotal: 200000, discount: 100000, tax: 11000, shipping: 0, total: 111000 }}
      />,
    );
    expect(screen.getByText('Tax (11%)')).toBeInTheDocument();
  });

  it('renders one decimal place for fractional rates', () => {
    // taxable 200000, tax 25000 => 12.5%
    render(
      <OrderSummary
        totals={{ subtotal: 200000, discount: 0, tax: 25000, shipping: 0, total: 225000 }}
      />,
    );
    expect(screen.getByText('Tax (12.5%)')).toBeInTheDocument();
  });

  it('falls back to a plain "Tax" label when there is no taxable base', () => {
    render(<OrderSummary totals={{ subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 }} />);
    expect(screen.getByText('Tax')).toBeInTheDocument();
  });
});
