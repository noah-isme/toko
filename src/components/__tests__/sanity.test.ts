import { describe, expect, it } from 'vitest';

import { priceSchema } from '@/lib/api/schemas';

describe('sanity checks', () => {
  it('validates price schema', () => {
    const result = priceSchema.parse({ amount: 9.99, currency: 'USD' });
    expect(result).toEqual({ amount: 9.99, currency: 'USD' });
  });
});
