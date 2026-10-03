import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS } from '../data';

export type SeedProduct = (typeof SEED_PRODUCTS)[number];

/** Catalog product as served by the mock API (API contract v0.2.0). */
export type MockProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  imageUrl: string;
  images: string[];
  stock: number;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: string;
};

/**
 * Deterministic UUID-shaped id derived from a slug. Product ids have always
 * been derived this way by the mock route, and E2E specs rely on them.
 */
export function stableUuid(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = Math.abs(hash).toString(16).padEnd(32, 'a').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildProduct(
  seed: SeedProduct = SEED_PRODUCTS[0],
  overrides: Partial<MockProduct> = {},
): MockProduct {
  const category = SEED_CATEGORIES.find((c) => c.slug === seed.category);
  const brand = SEED_BRANDS.find((b) => b.slug === seed.brand);
  return {
    id: stableUuid(seed.slug),
    title: seed.title,
    slug: seed.slug,
    description: `Description for ${seed.title}`,
    price: seed.price,
    originalPrice: seed.price * 1.2,
    discountPercent: 20,
    currency: 'IDR',
    categoryId: category?.id || seed.category,
    categoryName: category?.name || seed.category,
    brandId: brand?.id || seed.brand,
    brandName: brand?.name || seed.brand,
    imageUrl: seed.thumbnail,
    images: [seed.thumbnail],
    stock: 20,
    inStock: true,
    rating: 4.5,
    reviewCount: 150,
    tags: ['new', seed.category],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

/** The curated catalog from `data.ts`, optionally truncated to `n`. */
export function buildProductList(n: number = SEED_PRODUCTS.length): MockProduct[] {
  return SEED_PRODUCTS.slice(0, n).map((seed) => buildProduct(seed));
}
