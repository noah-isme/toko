import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { checkFavoriteStatus, listFavorites, toggleFavorite } from './api';

import { mockFavorites } from '@/mocks/handlers.favorites';
import { server } from '@/mocks/server';

const BASE_URL = 'http://localhost:8080/api/v1';

describe('Favorites API', () => {
  beforeEach(() => {
    mockFavorites.length = 0;
  });

  afterEach(() => {
    mockFavorites.length = 0;
  });

  it('listFavorites validates and maps the backend response', async () => {
    server.use(
      http.get(`${BASE_URL}/favorites`, () => {
        return HttpResponse.json([
          {
            product_id: 'prod-1',
            product_name: 'Product One',
            product_slug: 'product-one',
            price: 100000,
            image_url: 'https://example.com/one.jpg',
            created_at: '2026-07-24T00:00:00Z',
          },
        ]);
      }),
    );

    const items = await listFavorites();

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      productId: 'prod-1',
      productName: 'Product One',
      productSlug: 'product-one',
      price: 100000,
      imageUrl: 'https://example.com/one.jpg',
      createdAt: '2026-07-24T00:00:00Z',
    });
  });

  it('listFavorites throws when the backend response is malformed', async () => {
    server.use(
      http.get(`${BASE_URL}/favorites`, () => {
        return HttpResponse.json([{ product_id: 'prod-1' }]);
      }),
    );

    await expect(listFavorites()).rejects.toThrow();
  });

  it('toggleFavorite validates and returns the response', async () => {
    server.use(
      http.post(`${BASE_URL}/favorites`, () => {
        return HttpResponse.json({ favorited: true });
      }),
    );

    const result = await toggleFavorite('prod-1');
    expect(result).toEqual({ favorited: true });
  });

  it('toggleFavorite throws when the response is missing favorited', async () => {
    server.use(
      http.post(`${BASE_URL}/favorites`, () => {
        return HttpResponse.json({ added: true });
      }),
    );

    await expect(toggleFavorite('prod-1')).rejects.toThrow();
  });

  it('checkFavoriteStatus validates and returns the response', async () => {
    server.use(
      http.get(`${BASE_URL}/favorites/:productId`, () => {
        return HttpResponse.json({ favorited: false });
      }),
    );

    const result = await checkFavoriteStatus('prod-1');
    expect(result).toEqual({ favorited: false });
  });
});
