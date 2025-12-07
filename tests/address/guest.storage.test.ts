import { describe, expect, it, beforeEach } from 'vitest';

import {
  readGuestAddresses,
  writeGuestAddresses,
  setGuestDefaultId,
  getGuestDefaultId,
  getGuestAddressOwnerId,
} from '@/entities/address/storage';
import type { Address } from '@/entities/address/types';

describe('guest address storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists and reads guest addresses safely', () => {
    const payload: Address[] = [
      {
        id: 'guest-1',
        fullName: 'Guest User',
        phone: '081111111',
        line1: 'Jl. Guest 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    expect(writeGuestAddresses(payload)).toBe(true);
    const stored = readGuestAddresses();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.fullName).toBe('Guest User');
  });

  it('stores default id and survives reloads', () => {
    setGuestDefaultId('guest-addr');
    expect(getGuestDefaultId()).toBe('guest-addr');

    setGuestDefaultId(null);
    expect(getGuestDefaultId()).toBeNull();
  });

  it('creates a stable guest owner id', () => {
    const first = getGuestAddressOwnerId();
    const second = getGuestAddressOwnerId();
    expect(first).toBe(second);
    expect(first).toMatch(/^guest-/);
  });
});
