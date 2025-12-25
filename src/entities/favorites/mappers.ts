import type { ApiFavoriteItem, FavoriteItem } from './types';

export function mapApiFavoriteToFavorite(api: ApiFavoriteItem): FavoriteItem {
  return {
    productId: api.product_id,
    productName: api.product_name,
    productSlug: api.product_slug,
    price: api.price,
    imageUrl: api.image_url,
    createdAt: api.created_at,
  };
}
