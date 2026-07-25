import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';

import { createReview, listReviews } from './api';
import { reviewCreateInputSchema } from './types';

import { server } from '@/mocks/server';

const BASE_URL = 'http://localhost:8080/api/v1';

describe('Reviews API', () => {
  it('listReviews validates the raw backend shape and maps fabricated fields', async () => {
    server.use(
      http.get(`${BASE_URL}/products/:productId/reviews`, () => {
        return HttpResponse.json([
          {
            id: 'review-1',
            product_id: 'product-1',
            user_id: 'user-1',
            rating: 5,
            comment: 'Great product!',
            created_at: '2026-07-24T10:00:00Z',
            updated_at: '2026-07-24T10:00:00Z',
            tenant_id: 'tenant-1',
          },
        ]);
      }),
    );

    const result = await listReviews('product-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      id: 'review-1',
      productId: 'product-1',
      author: 'user-1',
      rating: 5,
      body: 'Great product!',
      createdAt: '2026-07-24T10:00:00Z',
      status: 'approved',
      helpfulCount: 0,
      myVote: null,
    });
  });

  it('listReviews throws when the backend response contains fabricated fields instead of raw ones', async () => {
    server.use(
      http.get(`${BASE_URL}/products/:productId/reviews`, () => {
        // Simulating the old mock handler that returned the mapped Review shape
        return HttpResponse.json([
          {
            id: 'review-1',
            productId: 'product-1',
            author: 'user-1',
            rating: 5,
            body: 'Great product!',
            createdAt: '2026-07-24T10:00:00Z',
            status: 'approved',
            helpfulCount: 0,
            myVote: null,
          },
        ]);
      }),
    );

    await expect(listReviews('product-1')).rejects.toThrow();
  });

  it('createReview validates the raw backend response and returns id with pending status', async () => {
    server.use(
      http.post(`${BASE_URL}/products/:productId/reviews`, () => {
        return HttpResponse.json(
          {
            id: 'review-new',
            product_id: 'product-1',
            user_id: 'user-1',
            rating: 4,
            comment: 'Good enough',
            created_at: '2026-07-24T11:00:00Z',
            updated_at: '2026-07-24T11:00:00Z',
            tenant_id: 'tenant-1',
          },
          { status: 201 },
        );
      }),
    );

    const input = reviewCreateInputSchema.parse({ rating: 4, body: 'Good enough' });
    const result = await createReview('product-1', input);

    expect(result).toEqual({ id: 'review-new', status: 'pending' });
  });
});
