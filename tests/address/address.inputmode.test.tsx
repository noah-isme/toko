import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddressForm } from '@/entities/address/ui/AddressForm';

describe('AddressForm mobile keyboards and autofill', () => {
  it('uses a phone keyboard and tel autofill for the phone number', () => {
    render(<AddressForm onSubmit={vi.fn()} />);

    const phone = screen.getByLabelText('Nomor telepon');
    expect(phone).toHaveAttribute('type', 'tel');
    expect(phone).toHaveAttribute('inputmode', 'tel');
    expect(phone).toHaveAttribute('autocomplete', 'tel');
  });

  it('uses a numeric keyboard for Indonesian postal codes only', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    const postal = screen.getByLabelText('Kode pos');
    expect(postal).toHaveAttribute('inputmode', 'numeric');
    expect(postal).toHaveAttribute('autocomplete', 'postal-code');

    const country = screen.getByLabelText('Negara');
    await user.clear(country);
    await user.type(country, 'SG');
    expect(postal).toHaveAttribute('inputmode', 'text');

    await user.clear(country);
    await user.type(country, 'Indonesia');
    expect(postal).toHaveAttribute('inputmode', 'numeric');
  });

  it('autofills the country as a code and the address lines by part', () => {
    render(<AddressForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Negara')).toHaveAttribute('autocomplete', 'country');
    expect(screen.getByLabelText('Nama penerima')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/Kota/)).toHaveAttribute('autocomplete', 'address-level2');
    expect(screen.getByLabelText('Provinsi')).toHaveAttribute('autocomplete', 'address-level1');
  });
});
