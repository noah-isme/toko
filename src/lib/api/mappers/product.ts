import type { Product } from '../schemas';
import type { ApiProduct } from '../types';

// Map API response to internal Product type
// Handles both ApiProduct format (thumbnail) and API Contract format (imageUrl)
export function mapApiProductToProduct(apiProduct: ApiProduct | Product): Product {
  // Handle case where data is already in Product format (e.g., from mock)
  const asAny = apiProduct as any;

  // Get image from either format
  const thumbnail = asAny.thumbnail || asAny.imageUrl;

  // Construct images array from available sources
  const images: string[] = asAny.images || [];
  if (thumbnail && !images.includes(thumbnail)) {
    images.unshift(thumbnail);
  }

  return {
    id: apiProduct.id,  // This should ALWAYS exist
    title: apiProduct.title,
    slug: apiProduct.slug,
    description: apiProduct.description || '',
    price: apiProduct.price,
    originalPrice: asAny.originalPrice || asAny.compareAt,
    discountPercent: asAny.discountPercent,
    currency: asAny.currency || 'IDR',
    categoryId: asAny.categoryId,
    categoryName: asAny.categoryName,
    brandId: asAny.brandId || asAny.brand,
    brandName: asAny.brandName,
    imageUrl: thumbnail,
    images,
    stock: asAny.stock ?? (asAny.inStock ? 10 : 0),
    inStock: asAny.inStock ?? true,
    rating: asAny.rating || 0,
    reviewCount: asAny.reviewCount || 0,
    tags: asAny.tags || asAny.badges || [],
    createdAt: asAny.createdAt,
  };
}
