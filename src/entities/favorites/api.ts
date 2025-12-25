import { mapApiFavoriteToFavorite } from './mappers';
import type { ApiFavoriteItem, FavoriteItem, ToggleFavoriteResponse } from './types';

import { apiClient } from '@/lib/api/apiClient';

/**
 * List user's favorites (requires authentication)
 */
export async function listFavorites(): Promise<FavoriteItem[]> {
  // Backend returns raw array
  const response = await apiClient<ApiFavoriteItem[]>('/favorites', {
    requiresAuth: true,
  });
  return response.map(mapApiFavoriteToFavorite);
}

/**
 * Toggle favorite status (requires authentication)
 * Returns { favorited: true } if added, { favorited: false } if removed
 */
export async function toggleFavorite(productId: string): Promise<ToggleFavoriteResponse> {
  return apiClient<ToggleFavoriteResponse>('/favorites', {
    method: 'POST',
    body: JSON.stringify({ productId }),
    requiresAuth: true,
  });
}

/**
 * Check if product is favorited (requires authentication)
 */
export async function checkFavoriteStatus(productId: string): Promise<ToggleFavoriteResponse> {
  return apiClient<ToggleFavoriteResponse>(`/favorites/${productId}`, {
    requiresAuth: true,
  });
}
