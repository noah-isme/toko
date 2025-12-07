import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddressForm } from '@/entities/address/ui/AddressForm';

describe('AddressForm accessibility', () => {
  it('links labels and toggles aria-invalid on validation', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AddressForm onSubmit={handleSubmit} />);

    const nameInput = screen.getByLabelText('Nama penerima');
    expect(nameInput).toHaveAttribute('aria-invalid', 'false');

    await user.click(screen.getByRole('button', { name: /simpan alamat/i }));

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });
});
