import { afterEach, describe, expect, it, vi } from 'vitest';

import { reverseGeocode, searchGeocoding } from '@/lib/geocoding/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('geocoding client', () => {
  it('uses the documented same-origin transition proxy and normalizes search results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            place_id: 42,
            display_name: 'Jl. Sudirman, Jakarta',
            lat: '-6.2',
            lon: '106.8',
            address: { city: 'Jakarta', postcode: 10220 },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchGeocoding('Jl. Sudirman', 1);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/geocode/search?q=Jl.+Sudirman&limit=1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(results[0]).toMatchObject({
      place_id: 42,
      display_name: 'Jl. Sudirman, Jakarta',
      address: { city: 'Jakarta' },
    });
  });

  it('normalizes reverse-geocoding responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ address: { road: 'Jl. Sudirman' }, displayName: 'Jakarta' }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(reverseGeocode(-6.2, 106.8)).resolves.toEqual({
      address: { road: 'Jl. Sudirman' },
      displayName: 'Jakarta',
    });
  });
});
