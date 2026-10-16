import { Faker, base, en, id_ID } from '@faker-js/faker';

/** Seed shared by every mock fixture so MSW, the route handler and SSR agree. */
export const MOCK_FAKER_SEED = 20260101;
/** Reference date for faker's relative date helpers (`recent`, `past`, ...). */
export const MOCK_REF_DATE = '2026-01-01T00:00:00Z';

/**
 * A faker instance with Indonesian data first and English as the fallback,
 * seeded so the same seed always yields the same values.
 */
export function createSeededFaker(seed: number = MOCK_FAKER_SEED): Faker {
  const faker = new Faker({ locale: [id_ID, en, base] });
  faker.seed(seed);
  faker.setDefaultRefDate(MOCK_REF_DATE);
  return faker;
}

/**
 * Shared seeded instance for MSW handlers that generate data per request
 * (reviews, Q&A, sessions, ...). Values depend on call order, but they no
 * longer change between runs.
 */
export const mockFaker = createSeededFaker();
