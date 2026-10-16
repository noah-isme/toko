import { SEED_CATEGORIES } from '../data';

export type MockCategory = (typeof SEED_CATEGORIES)[number];

export function buildCategory(overrides: Partial<MockCategory> = {}): MockCategory {
  return { ...SEED_CATEGORIES[0], ...overrides };
}

/** The curated categories from `data.ts`, optionally truncated to `n`. */
export function buildCategoryList(n: number = SEED_CATEGORIES.length): MockCategory[] {
  return SEED_CATEGORIES.slice(0, n).map((category) => buildCategory(category));
}
