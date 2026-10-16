import { SEED_BRANDS } from '../data';

export type MockBrand = (typeof SEED_BRANDS)[number];

export function buildBrand(overrides: Partial<MockBrand> = {}): MockBrand {
  return { ...SEED_BRANDS[0], ...overrides };
}

/** The curated brands from `data.ts`, optionally truncated to `n`. */
export function buildBrandList(n: number = SEED_BRANDS.length): MockBrand[] {
  return SEED_BRANDS.slice(0, n).map((brand) => buildBrand(brand));
}
