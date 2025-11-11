import type { FavoriteItem, FavoritesResponse } from './types';

import { apiClient } from '@/lib/api/apiClient';


export async function listFavorites(): Promise<FavoriteItem[]> {
  const response = await apiClient<FavoritesResponse>('/favorites');
  return response.items;
}

export async function addFavorite(productId: string): Promise<void> {
  await apiClient('/favorites', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export async function removeFavorite(productId: string): Promise<void> {
  await apiClient(`/favorites/${productId}`, {
    method: 'DELETE',
  });
}
