import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Price } from '@/components/price';

// Server (Node ICU) and browser must render the same text, or hydration of
// server-rendered product cards fails. Fraction digits are pinned for that.
describe('Price', () => {
  it('renders IDR without decimals', () => {
    render(<Price amount={30_000_000} currency="IDR" locale="id-ID" data-testid="p" />);
    expect(screen.getByTestId('p').textContent?.replace(/\s/g, ' ')).toBe('Rp 30.000.000');
  });

  it('renders other currencies with two decimals', () => {
    render(<Price amount={12.5} data-testid="p" />);
    expect(screen.getByTestId('p')).toHaveTextContent('$12.50');
  });
});
