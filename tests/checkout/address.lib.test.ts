import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent: (...args: unknown[]) => captureMock(...args),
}));

import {
  formatAddressText,
  mapAddressToCheckout,
  trackCheckoutAddressSelect,
} from '@/app/(storefront)/checkout/_lib/address';
import type { Address } from '@/entities/address/types';

const baseAddress: Address = {
  id: 'addr-1',
  receiverName: 'Budi Santoso',
  phone: '081234567890',
  addressLine1: 'Jl. Sudirman No. 1',
  addressLine2: 'Lantai 5',
  city: 'Jakarta Pusat',
  province: 'DKI Jakarta',
  postalCode: '10220',
  country: 'Indonesia',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('mapAddressToCheckout', () => {
  it('copies the shipping fields and drops saved-address metadata', () => {
    expect(mapAddressToCheckout(baseAddress)).toEqual({
      receiverName: 'Budi Santoso',
      phone: '081234567890',
      addressLine1: 'Jl. Sudirman No. 1',
      addressLine2: 'Lantai 5',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postalCode: '10220',
      country: 'Indonesia',
    });
  });

  it('defaults the country to Indonesia when missing', () => {
    const withoutCountry = { ...baseAddress, country: undefined } as unknown as Address;
    expect(mapAddressToCheckout(withoutCountry).country).toBe('Indonesia');
  });
});

describe('formatAddressText', () => {
  it('joins all parts with a bullet separator', () => {
    expect(formatAddressText('Jl. A', 'Blok B', 'Bandung', 'Jawa Barat', '40111')).toBe(
      'Jl. A • Blok B • Bandung, Jawa Barat • 40111',
    );
  });

  it('omits an empty second address line', () => {
    expect(formatAddressText('Jl. A', undefined, 'Bandung', 'Jawa Barat', '40111')).toBe(
      'Jl. A • Bandung, Jawa Barat • 40111',
    );
    expect(formatAddressText('Jl. A', '', 'Bandung', 'Jawa Barat', '40111')).toBe(
      'Jl. A • Bandung, Jawa Barat • 40111',
    );
  });
});

describe('trackCheckoutAddressSelect', () => {
  beforeEach(() => captureMock.mockClear());

  it('captures the checkout_address_select event', () => {
    trackCheckoutAddressSelect(baseAddress);
    expect(captureMock).toHaveBeenCalledWith('checkout_address_select', {
      addressId: 'addr-1',
      country: 'Indonesia',
      province: 'DKI Jakarta',
    });
  });
});
