import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { productApiParamsFromSearchParams } from '@/entities/search/lib/apiParams';
import { SEED_BRANDS, SEED_CATEGORIES } from '@/mocks/data';
import { listProducts } from '@/mocks/resolvers/catalog';

const LANDING_DIR = join(process.cwd(), 'src/components/landing');

/** Every literal `/products?...` href in the landing components, with its file. */
function landingProductLinks(): { file: string; href: string }[] {
  const links: { file: string; href: string }[] = [];
  for (const file of readdirSync(LANDING_DIR)) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    const source = readFileSync(join(LANDING_DIR, file), 'utf8');
    // Literal strings only; template literals with `${...}` take their slug from data.
    for (const match of source.matchAll(/["'`](\/products\?[^"'`$]*)["'`]/g)) {
      links.push({ file, href: match[1] });
    }
  }
  return links;
}

const categorySlugs = new Set(SEED_CATEGORIES.map((category) => category.slug));
const brandSlugs = new Set(SEED_BRANDS.map((brand) => brand.slug));

describe('landing page product links', () => {
  const links = landingProductLinks();
  const filtered = links.filter(({ href }) => {
    const params = new URLSearchParams(href.split('?')[1]);
    return params.has('category') || params.has('brand');
  });

  it('finds the hard-coded category links', () => {
    // Guards the scan itself: the hero links to at least two categories.
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it.each(filtered)('$file links $href to a category or brand slug that exists', ({ href }) => {
    const params = new URLSearchParams(href.split('?')[1]);
    const category = params.get('category');
    const brand = params.get('brand');
    if (category !== null) expect(categorySlugs).toContain(category);
    if (brand !== null) expect(brandSlugs).toContain(brand);

    // The search page forwards the slug to the API unchanged.
    const apiParams = productApiParamsFromSearchParams(params);
    if (category !== null) expect(apiParams.category).toBe(category);
    if (brand !== null) expect(apiParams.brand).toBe(brand);

    // ...and the mock API (which, like the backend, filters by that slug) has products for it.
    const request = new URLSearchParams();
    if (apiParams.category) request.set('category', apiParams.category);
    if (apiParams.brand) request.set('brand', apiParams.brand);
    expect(listProducts(request).pagination.totalItems).toBeGreaterThan(0);
  });
});
