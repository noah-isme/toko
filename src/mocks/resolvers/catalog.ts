import type { MockProduct } from '../factories/product';
import { brands, categories, products, soldOutDemoProduct } from '../fixtures';

import { resolveQa } from './qa';
import type { MockResolver, MockResult } from './types';

type FacetTerm = { id: string; name: string; slug: string; count: number };

type ProductFacets = {
  categories: FacetTerm[];
  brands: FacetTerm[];
  price: { buckets: Array<{ min: number; max: number | null; count: number }> };
  inStock: { true: number; false: number };
};

type SearchMeta = {
  searchMode: 'fts' | 'fuzzy';
  suggestions?: Array<{ title: string; slug: string }>;
};

type ProductPage = {
  data: MockProduct[];
  pagination: { page: number; perPage: number; totalItems: number };
  meta?: SearchMeta;
  facets?: ProductFacets;
};

/** Same edges (IDR) as the API's price facet: 9 buckets, the last open-ended. */
const PRICE_BUCKET_EDGES = [
  50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000,
];
const FACET_TERM_LIMIT = 50;
/** The API retries with fuzzy title matching only for 3-64 code points. */
const FUZZY_MIN_RUNES = 3;
const FUZZY_MAX_RUNES = 64;
const FUZZY_THRESHOLD = 0.5;
const SUGGESTION_THRESHOLD = 0.3;
const SUGGESTION_LIMIT = 5;

/** Deterministic stand-in for "units sold in paid orders" (popularity sort). */
export function mockUnitsSold(product: MockProduct): number {
  let hash = 0;
  for (const ch of product.slug) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return hash % 500;
}

const SORTERS: Record<string, (a: MockProduct, b: MockProduct) => number> = {
  'price:asc': (a, b) => a.price - b.price,
  'price:desc': (a, b) => b.price - a.price,
  'title:asc': (a, b) => a.title.localeCompare(b.title),
  'title:desc': (a, b) => b.title.localeCompare(a.title),
  'name:asc': (a, b) => a.title.localeCompare(b.title),
  'name:desc': (a, b) => b.title.localeCompare(a.title),
  'popularity:desc': (a, b) => mockUnitsSold(b) - mockUnitsSold(a),
  'rating:desc': (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
};
SORTERS.popularity = SORTERS['popularity:desc'];
SORTERS.rating = SORTERS['rating:desc'];

/** pg_trgm-style trigrams of each lower-cased word (padded with two leading blanks). */
function trigrams(text: string): Set<string> {
  const grams = new Set<string>();
  for (const word of text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/** Rough `word_similarity(q, title)`: best trigram overlap of q with one title word. */
function wordSimilarity(query: string, title: string): number {
  const q = trigrams(query);
  if (q.size === 0) return 0;
  let best = 0;
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const w = trigrams(word);
    let shared = 0;
    q.forEach((gram) => {
      if (w.has(gram)) shared++;
    });
    best = Math.max(best, shared / (q.size + w.size - shared));
  }
  return best;
}

function matchesTaxonomy(
  value: string,
  id: string,
  name: string,
  list: ReadonlyArray<{ id: string; slug: string }>,
): boolean {
  const lower = value.toLowerCase();
  if (id === value || name.toLowerCase() === lower) return true;
  return list.some((item) => item.id === id && item.slug.toLowerCase() === lower);
}

type Dimension = 'category' | 'brand' | 'price' | 'inStock';

function facetTerms(
  items: MockProduct[],
  key: 'category' | 'brand',
  list: ReadonlyArray<{ id: string; name: string; slug: string }>,
): FacetTerm[] {
  const counts = new Map<string, FacetTerm>();
  for (const p of items) {
    const id = key === 'category' ? p.categoryId : p.brandId;
    const known = list.find((item) => item.id === id);
    const term = counts.get(id) ?? {
      id,
      name: known?.name ?? (key === 'category' ? p.categoryName : p.brandName),
      slug: known?.slug ?? id,
      count: 0,
    };
    term.count++;
    counts.set(id, term);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, FACET_TERM_LIMIT);
}

/**
 * `GET products`: filters (`q`, `category`, `brand` by id, name or slug,
 * `minPrice`, `maxPrice`, `inStock`), `sort` (price, title, popularity,
 * rating), `page`/`limit` pagination (default 20 per page) and, like the API,
 * `meta` for searches (fuzzy title fallback and "did you mean" suggestions)
 * and `facets` with `include=facets` (each dimension ignores its own filter).
 */
/** Longest `q` the API accepts, in code points after trimming (catalog.MaxQueryRunes). */
const MAX_QUERY_RUNES = 200;

/** The API's 400 for a `q` over the limit; `undefined` when the query is acceptable. */
export function productQueryError(searchParams: URLSearchParams): MockResult | undefined {
  const q = searchParams.get('q')?.trim() ?? '';
  const runes = [...q].length;
  if (runes <= MAX_QUERY_RUNES) return undefined;
  return {
    status: 400,
    error: {
      code: 'BAD_REQUEST',
      message: `q must be at most ${MAX_QUERY_RUNES} characters`,
      details: { field: 'q' },
    },
  };
}

export function listProducts(searchParams: URLSearchParams): ProductPage {
  const q = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const inStock = searchParams.get('inStock');
  const sort = searchParams.get('sort');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('limit') || '20', 10);
  const includeFacets = searchParams
    .getAll('include')
    .some((raw) => raw.split(',').some((token) => token.trim().toLowerCase() === 'facets'));

  const filters: Record<Dimension, (p: MockProduct) => boolean> = {
    category: (p) =>
      !category || matchesTaxonomy(category, p.categoryId, p.categoryName, categories),
    brand: (p) => !brand || matchesTaxonomy(brand, p.brandId, p.brandName, brands),
    price: (p) =>
      (!minPrice || p.price >= parseInt(minPrice, 10)) &&
      (!maxPrice || p.price <= parseInt(maxPrice, 10)),
    inStock: (p) => {
      if (inStock === 'true') return p.inStock && p.stock > 0;
      if (inStock === 'false') return !(p.inStock && p.stock > 0);
      return true;
    },
  };
  const applyFilters = (items: MockProduct[], except?: Dimension) =>
    items.filter((p) =>
      (Object.keys(filters) as Dimension[]).every((dim) => dim === except || filters[dim](p)),
    );

  let searchMode: SearchMeta['searchMode'] = 'fts';
  let matched = [...products];
  if (q) {
    const query = q.toLowerCase();
    matched = products.filter((p) =>
      [p.title, p.description, p.categoryName, p.brandName].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
    const runes = Array.from(q).length;
    const fuzzyEligible = runes >= FUZZY_MIN_RUNES && runes <= FUZZY_MAX_RUNES;
    if (applyFilters(matched).length === 0 && fuzzyEligible) {
      const fuzzy = products.filter((p) => wordSimilarity(q, p.title) >= FUZZY_THRESHOLD);
      if (applyFilters(fuzzy).length > 0) {
        matched = fuzzy;
        searchMode = 'fuzzy';
      }
    }
  }

  const filtered = applyFilters(matched);
  if (sort && SORTERS[sort]) filtered.sort(SORTERS[sort]);

  const start = (page - 1) * perPage;
  const result: ProductPage = {
    data: filtered.slice(start, start + perPage),
    pagination: { page, perPage, totalItems: filtered.length },
  };

  if (q) {
    const meta: SearchMeta = { searchMode };
    const runes = Array.from(q).length;
    if (filtered.length === 0 && runes >= FUZZY_MIN_RUNES && runes <= FUZZY_MAX_RUNES) {
      // Like the API, suggestions are the closest titles in the whole catalog.
      const suggestions = products
        .map((p) => ({ title: p.title, slug: p.slug, score: wordSimilarity(q, p.title) }))
        .filter((s) => s.score >= SUGGESTION_THRESHOLD)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, SUGGESTION_LIMIT)
        .map(({ title, slug }) => ({ title, slug }));
      if (suggestions.length > 0) meta.suggestions = suggestions;
    }
    result.meta = meta;
  }

  if (includeFacets) {
    const byPrice = applyFilters(matched, 'price');
    const byStock = applyFilters(matched, 'inStock');
    const inStockCount = byStock.filter((p) => p.inStock && p.stock > 0).length;
    result.facets = {
      categories: facetTerms(applyFilters(matched, 'category'), 'category', categories),
      brands: facetTerms(applyFilters(matched, 'brand'), 'brand', brands),
      price: {
        buckets: [0, ...PRICE_BUCKET_EDGES].map((min, i) => {
          const max = PRICE_BUCKET_EDGES[i] ?? null;
          return {
            min,
            max,
            count: byPrice.filter((p) => p.price >= min && (max === null || p.price < max)).length,
          };
        }),
      },
      inStock: { true: inStockCount, false: byStock.length - inStockCount },
    };
  }

  return result;
}

/** Catalog product by slug; also serves the off-catalog sold-out QA product. */
export function getProduct(slug: string): MockProduct | undefined {
  if (slug === soldOutDemoProduct.slug) return soldOutDemoProduct;
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
  if (path === 'products' && method === 'GET') {
    return productQueryError(req.searchParams) ?? listProducts(req.searchParams);
  }

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
