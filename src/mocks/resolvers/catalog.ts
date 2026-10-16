import type { MockProduct } from '../factories/product';
import { brands, categories, products } from '../fixtures';

import { resolveQa } from './qa';
import type { MockResolver, MockResult } from './types';

type ProductPage = {
  data: MockProduct[];
  pagination: { page: number; perPage: number; totalItems: number };
};

const SORTERS: Record<string, (a: MockProduct, b: MockProduct) => number> = {
  'price:asc': (a, b) => a.price - b.price,
  'price:desc': (a, b) => b.price - a.price,
  'name:asc': (a, b) => a.title.localeCompare(b.title),
  'name:desc': (a, b) => b.title.localeCompare(a.title),
};

/**
 * `GET products`: filters (`q`, `category`, `brand`, `minPrice`, `maxPrice`,
 * `inStock`), `sort` and `page`/`limit` pagination (default 20 per page).
 */
export function listProducts(searchParams: URLSearchParams): ProductPage {
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sort = searchParams.get('sort');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('limit') || '20', 10);

  let filtered = [...products];
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter((p) =>
      [p.title, p.description, p.categoryName, p.brandName].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }
  if (category) {
    const name = category.toLowerCase();
    filtered = filtered.filter(
      (p) => p.categoryId === category || p.categoryName.toLowerCase() === name,
    );
  }
  if (brand) {
    const name = brand.toLowerCase();
    filtered = filtered.filter((p) => p.brandId === brand || p.brandName.toLowerCase() === name);
  }
  if (minPrice) filtered = filtered.filter((p) => p.price >= parseInt(minPrice, 10));
  if (maxPrice) filtered = filtered.filter((p) => p.price <= parseInt(maxPrice, 10));
  if (searchParams.get('inStock') === 'true')
    filtered = filtered.filter((p) => p.inStock && p.stock > 0);
  if (sort && SORTERS[sort]) filtered.sort(SORTERS[sort]);

  const start = (page - 1) * perPage;
  return {
    data: filtered.slice(start, start + perPage),
    pagination: { page, perPage, totalItems: filtered.length },
  };
}

export function getProduct(slug: string): MockProduct | undefined {
  return products.find((p) => p.slug === slug);
}

export function getRelated(slug: string): MockProduct[] {
  return products.filter((product) => product.slug !== slug).slice(0, 4);
}

const REVIEW_STATS = {
  average_rating: 0,
  total_reviews: 0,
  count_1_star: 0,
  count_2_star: 0,
  count_3_star: 0,
  count_4_star: 0,
  count_5_star: 0,
};

/** Taxonomy, product list, detail, related, reviews and Q&A. */
export const resolveCatalog: MockResolver = (req): MockResult | undefined => {
  const { path, method } = req;
  // Same payloads as the MSW handlers; the filter sidebar needs both.
  if (path === 'categories' && method === 'GET') return { data: categories };
  if (path === 'brands' && method === 'GET') return { data: brands };
  if (path === 'products' && method === 'GET') return listProducts(req.searchParams);

  const isProductGet = path.startsWith('products/') && method === 'GET';
  if (isProductGet && path.endsWith('/reviews/stats')) return { ...REVIEW_STATS };
  if (isProductGet && path.endsWith('/reviews')) return [];
  if (isProductGet && path.endsWith('/related')) return { data: getRelated(path.split('/')[1]) };

  const qa = resolveQa(req);
  if (qa !== undefined) return qa;

  if (isProductGet) {
    const product = getProduct(path.split('/')[1]);
    return product ? { data: product } : { status: 404, message: 'Product not found' };
  }
  return undefined;
};
