import type { Product } from '../schemas';
import type { ApiProduct } from '../types';

export function mapApiProductToProduct(apiProduct: ApiProduct): Product {
  // Determine currency (default to IDR if not provided)
  const currency = 'IDR';

  // Construct images array
  const images = apiProduct.thumbnail ? [apiProduct.thumbnail] : [];

  return {
    id: apiProduct.id,
    name: apiProduct.title, // Map title -> name
    slug: apiProduct.slug,
    description: apiProduct.description || '',
    price: {
      amount: apiProduct.price,
      currency,
    },
    images,
    rating: apiProduct.rating || 0,
    reviewCount: apiProduct.reviewCount || 0,
    inventory: apiProduct.inStock ? 10 : 0, // Fallback if no specific stock count
    categories: [], // Map if available, or fetch separately
  };
}
