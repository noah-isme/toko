import { expect, test } from '@playwright/test';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');
const API_ROOT = API_URL.endsWith('/api/v1') ? API_URL.slice(0, -7) : API_URL;
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID?.trim();
const headers = TENANT_ID ? { 'X-Tenant-ID': TENANT_ID } : undefined;

test.describe('toko-api live contract', () => {
  test('serves health and catalog responses without MSW', async ({ request }) => {
    const health = await request.get(`${API_ROOT}/health/live`);
    expect(health.ok()).toBeTruthy();

    const response = await request.get(`${API_URL}/products?limit=1`, { headers });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.pagination).toMatchObject({ page: 1, perPage: 1 });

    if (body.data.length > 0) {
      const product = body.data[0];
      expect(product).toEqual(expect.objectContaining({ id: expect.any(String), slug: expect.any(String) }));
      const detailResponse = await request.get(`${API_URL}/products/${product.slug}`, { headers });
      expect(detailResponse.ok()).toBeTruthy();
      const detail = await detailResponse.json();
      expect(detail.data).toEqual(expect.objectContaining({ variants: expect.any(Array) }));
      for (const variant of detail.data.variants) {
        expect(variant).toEqual(expect.objectContaining({ id: expect.any(String), stock: expect.any(Number) }));
      }
    }
  });
});
