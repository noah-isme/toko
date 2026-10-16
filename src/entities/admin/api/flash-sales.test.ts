import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { adminFlashSalesApi } from './flash-sales';

import { server } from '@/mocks/server';

const BASE_URL = 'http://localhost:8080/api/v1';

const input = {
  name: 'Payday',
  slug: 'payday',
  status: 'SCHEDULED' as const,
  startsAt: '2026-11-01T00:00:00+07:00',
  endsAt: '2026-11-02T00:00:00+07:00',
  items: [],
};

describe('adminFlashSalesApi.updateFlashSale', () => {
  it('returns the full campaign from the API', async () => {
    server.use(
      http.patch(`${BASE_URL}/admin/flash-sales/fs-1`, () =>
        HttpResponse.json({ data: { id: 'fs-1', ...input } }),
      ),
    );

    await expect(adminFlashSalesApi.updateFlashSale('fs-1', input)).resolves.toMatchObject({
      id: 'fs-1',
      name: 'Payday',
    });
  });

  it('rejects a status-only response so the edit is not reported as saved', async () => {
    server.use(
      http.patch(`${BASE_URL}/admin/flash-sales/fs-1`, () =>
        HttpResponse.json({
          data: { id: 'fs-1', status: 'SCHEDULED', updatedAt: '2026-10-16T00:00:00Z' },
        }),
      ),
    );

    await expect(adminFlashSalesApi.updateFlashSale('fs-1', input)).rejects.toThrow(
      /status-only response/,
    );
  });
});
