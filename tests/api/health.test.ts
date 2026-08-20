import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/health/route';

describe('deployment health endpoint', () => {
  it('returns a small uncached liveness response', async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toMatchObject({ status: 'ok', service: 'toko-web' });
  });
});
