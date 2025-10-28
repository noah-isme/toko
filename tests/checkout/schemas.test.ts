import { describe, expect, it } from 'vitest';

import { AddressSchema, TotalsSchema } from '@/entities/checkout/schemas';

describe('AddressSchema', () => {
  it('accepts a valid address payload', () => {
    const data = {
      fullName: 'Jane Doe',
      phone: '08123456789',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      postalCode: '12120',
      detail: 'Jl. Senopati No. 12',
    };

    expect(() => AddressSchema.parse(data)).not.toThrow();
  });

  it('rejects incomplete address payloads', () => {
    const data = {
      fullName: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      postalCode: '',
      detail: '',
    };

    const result = AddressSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.error.flatten().fieldErrors)).toContain('fullName');
    }
  });
});

describe('TotalsSchema', () => {
  it('parses totals with numeric values', () => {
    const totals = TotalsSchema.parse({
      subtotal: 200_000,
      discount: 10_000,
      tax: 20_000,
      shipping: 15_000,
      total: 225_000,
    });

    expect(totals.total).toBe(225_000);
  });

  it('fails when any value is negative', () => {
    const result = TotalsSchema.safeParse({
      subtotal: 200_000,
      discount: -1,
      tax: 20_000,
      shipping: 15_000,
      total: 225_000,
    });

    expect(result.success).toBe(false);
  });
});
