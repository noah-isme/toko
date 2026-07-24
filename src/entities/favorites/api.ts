import { z, type ZodType } from 'zod';

import { mapApiFavoriteToFavorite } from './mappers';
import type { ApiFavoriteItem, FavoriteItem, ToggleFavoriteResponse } from './types';

import { apiClient } from '@/lib/api/apiClient';

const apiFavoriteItemSchema: ZodType<ApiFavoriteItem> = z.object({
  product_id: z.string(),
  product_name: z.string(),
  product_slug: z.string(),
  price: z.number(),
  image_url: z.string(),
  created_at: z.string(),
});

const apiFavoriteListSchema = z.array(apiFavoriteItemSchema);

const toggleFavoriteResponseSchema: ZodType<ToggleFavoriteResponse> = z.object({
  favorited: z.boolean(),
});

/**
 * List user's favorites (requires authentication)
 */
export async function listFavorites(): Promise<FavoriteItem[]> {
  // Backend returns raw array
  const response = await apiClient('/favorites', {
    requiresAuth: true,
    schema: apiFavoriteListSchema,
  });
  return response.map(mapApiFavoriteToFavorite);
}

/**
 * Toggle favorite status (requires authentication)
 * Returns { favorited: true } if added, { favorited: false } if removed
 */
export async function toggleFavorite(productId: string): Promise<ToggleFavoriteResponse> {
  return apiClient('/favorites', {
    method: 'POST',
    body: JSON.stringify({ productId }),
    requiresAuth: true,
    schema: toggleFavoriteResponseSchema,
  });
}

/**
 * Check if product is favorited (requires authentication)
 */
export async function checkFavoriteStatus(productId: string): Promise<ToggleFavoriteResponse> {
  return apiClient(`/favorites/${productId}`, {
    requiresAuth: true,
    schema: toggleFavoriteResponseSchema,
  });
}
