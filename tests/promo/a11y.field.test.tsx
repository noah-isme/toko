import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, createTestCart, seedCart } from './utils';

import { PromoField } from '@/entities/promo/ui/PromoField';


describe('promo field accessibility', () => {
  it('links label, helper, and error states correctly', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText(/masukkan kode/i);
    expect(input).toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');

    await user.click(screen.getByRole('button', { name: /terapkan/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/wajib diisi/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });
});
