import { SEED_USERS } from '../data';

/** The signed-in customer every mock auth endpoint answers with. */
export const MOCK_USER = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
} as const;

export type MockUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function buildUser(overrides: Partial<MockUser> = {}): MockUser {
  return { ...MOCK_USER, roles: [], ...overrides };
}

/** Seed users with their roles (`admin` or `customer`). */
export function buildUserList(n: number = SEED_USERS.length): MockUser[] {
  return SEED_USERS.slice(0, n).map((seed, index) =>
    buildUser({ id: `user-${index + 1}`, name: seed.name, email: seed.email, roles: [seed.role] }),
  );
}
