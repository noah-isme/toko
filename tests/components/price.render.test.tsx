import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { Price } from '@/components/price';

const plain = (value: string | null | undefined) => value?.replace(/\s/g, ' ');

// Server (Node ICU) and browser must render the same text, or hydration of
// server-rendered product cards fails. Fraction digits are pinned for that.
describe('Price', () => {
  it('renders IDR without decimals in id by default', () => {
    render(<Price amount={30_000_000} data-testid="p" />);
    expect(plain(screen.getByTestId('p').textContent)).toBe('Rp 30.000.000');
  });

  it('renders IDR as "IDR 1,000,000" in en', () => {
    renderWithIntl(<Price amount={1_000_000} currency="IDR" data-testid="p" />, { locale: 'en' });
    expect(plain(screen.getByTestId('p').textContent)).toBe('IDR 1,000,000');
  });

  it('renders other currencies with two decimals', () => {
    renderWithIntl(<Price amount={12.5} currency="USD" data-testid="p" />, { locale: 'en' });
    expect(screen.getByTestId('p')).toHaveTextContent('$12.50');
  });
});
