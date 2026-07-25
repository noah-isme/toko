import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CheckoutStepper } from '@/components/checkout-stepper';

describe('CheckoutStepper', () => {
  it('renders all three steps with labels', () => {
    render(<CheckoutStepper current="address" />);

    expect(screen.getByText('Alamat & Pengiriman')).toBeInTheDocument();
    expect(screen.getByText('Tinjauan & Pembayaran')).toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();
  });

  it('marks the current step with aria-current', () => {
    render(<CheckoutStepper current="review" />);

    const current = screen
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step');

    expect(current).toBeDefined();
    expect(within(current!).getByText('Tinjauan & Pembayaran')).toBeInTheDocument();
  });

  it('shows a check icon for completed steps', () => {
    const { container } = render(<CheckoutStepper current="success" />);

    // address + review are complete → two check icons rendered.
    const items = screen.getAllByRole('listitem');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[2].getAttribute('aria-current')).toBe('step');

    // lucide renders an <svg>; completed steps swap the number for a check.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('exposes an accessible progress nav', () => {
    render(<CheckoutStepper current="address" />);
    expect(screen.getByRole('navigation', { name: /progres checkout/i })).toBeInTheDocument();
  });
});
