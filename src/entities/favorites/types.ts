export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

export interface FavoritesResponse {
  items: FavoriteItem[];
}
