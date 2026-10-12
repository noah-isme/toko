import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_MESSAGES } from '../utils/next-intl-mock';
import { renderWithIntl } from '../utils/renderWithIntl';

import { createQueryClient } from './utils';

import { useSetDefaultAddressMutation } from '@/entities/address/hooks';
import {
  ADDRESS_VALIDATION_KEYS,
  addressInputSchema,
  isAddressValidationKey,
} from '@/entities/address/schemas';
import type { Address } from '@/entities/address/types';
import { AddressCard } from '@/entities/address/ui/AddressCard';
import { AddressForm } from '@/entities/address/ui/AddressForm';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';

const toast = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/toast')>();
  return { ...actual, useToast: () => ({ ...actual.useToast(), toast }) };
});

const address: Address = {
  id: 'addr-1',
  receiverName: 'Jane Doe',
  phone: '08123456789',
  addressLine1: 'Jl. Senopati No. 12',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  postalCode: '12120',
  country: 'ID',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  toast.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('address validation keys', () => {
  it('uses catalog keys as schema messages', () => {
    const result = addressInputSchema.safeParse({
      receiverName: '',
      phone: 'x',
      addressLine1: '',
      city: '',
      province: '',
      postalCode: '!',
      country: '',
    });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every(isAddressValidationKey)).toBe(true);
    expect(messages).toContain('receiverNameRequired');
    expect(messages).toContain('phoneTooShort');
  });

  it('has a catalog entry for every key in both locales', () => {
    for (const key of ADDRESS_VALIDATION_KEYS) {
      expect(TEST_MESSAGES.id.checkout.address.validation[key]).toBeTruthy();
      expect(TEST_MESSAGES.en.checkout.address.validation[key]).toBeTruthy();
    }
  });
});

describe('AddressForm', () => {
  it('renders labels and validation errors in English', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Map Location' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search location')).toHaveAttribute(
      'placeholder',
      'Type a city or postal code',
    );
    expect(screen.getByLabelText('Recipient name')).toBeInTheDocument();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save address' }));
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is too short')).toBeInTheDocument();
  });

  it('keeps the Indonesian validation text by default', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Nama penerima')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simpan alamat' }));
    expect(await screen.findByText('Nama lengkap wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Kota wajib diisi')).toBeInTheDocument();
  });
});

describe('AddressCard in English', () => {
  it('renders badges and action labels', () => {
    renderWithIntl(
      <AddressCard
        address={address}
        selectable
        isSelected
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />,
      { locale: 'en' },
    );
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Address already selected' })).toHaveTextContent(
      'Use',
    );
    expect(screen.getByRole('button', { name: 'Default address' })).toHaveTextContent(
      'Make default',
    );
    expect(screen.getByRole('button', { name: 'Edit address for Jane Doe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete address for Jane Doe' })).toHaveTextContent(
      'Delete',
    );
  });
});

describe('address mutation toasts in English', () => {
  it('reports a missing guest address', async () => {
    const client = createQueryClient();
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <NextIntlClientProvider
          locale="en"
          messages={TEST_MESSAGES.en}
          timeZone={TIME_ZONE}
          formats={FORMATS}
        >
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </NextIntlClientProvider>
      );
    }

    const { result } = renderHook(() => useSetDefaultAddressMutation(null), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync('missing').catch(() => {});
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to set primary address',
        description: 'Address not found',
        variant: 'destructive',
      }),
    );
  });
});
