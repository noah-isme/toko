// Raw API type (snake_case from backend)
export interface ApiFavoriteItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  image_url: string;
  created_at: string;
}

// Entity type (camelCase for frontend)
export interface FavoriteItem {
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  imageUrl: string;
  createdAt: string;
}

export interface FavoritesResponse {
  items: FavoriteItem[];
}

export interface ToggleFavoriteResponse {
  favorited: boolean;
}
