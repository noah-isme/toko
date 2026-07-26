/**
 * Compile-time conformance between the hand-written client types and the shapes
 * the backend actually documents in `openapi.yaml`.
 *
 * This file exports nothing at runtime. Its only job is to fail `pnpm typecheck`
 * when the two drift apart.
 *
 * Why it exists: several production bugs came from silent casing and shape drift
 * across this boundary — pagination sent `per_page` while the client read
 * `perPage`, and `/auth/me` sent `created_at` while the client read `createdAt`.
 * Both sides compiled, both test suites passed against hand-written mocks, and
 * the fields simply arrived as `undefined` at runtime. Regenerating the schema
 * (`pnpm api:generate`) now turns that class of drift into a build error.
 *
 * Direction: assertions check that the *wire* type satisfies what client code
 * expects. Client types may legitimately be looser (extra optional fields), but
 * anything the client requires must exist on the wire with a compatible type.
 */
import type { components } from './schema';

import type {
  ApiAddressResponse,
  ApiProduct,
  Brand,
  Category,
  Pagination,
  User,
} from '@/lib/api/types';

type Wire = components['schemas'];

/** Passes only when `T` is exactly `true`. */
type Expect<T extends true> = T;

/** True when every value of `A` is a valid `B`. */
type IsAssignable<A, B> = [A] extends [B] ? true : false;

/** True when `A` and `B` describe the same set of values. */
type IsExactly<A, B> =
  IsAssignable<A, B> extends true ? (IsAssignable<B, A> extends true ? true : false) : false;

// ---------------------------------------------------------------------------
// Pagination — checked in both directions.
//
// This is the shape that actually broke: a rename on either side must fail the
// build rather than silently yield undefined, so the key sets must match
// exactly, not merely be assignable.
// ---------------------------------------------------------------------------
type _PaginationMatches = Expect<IsExactly<Required<Wire['Pagination']>, Pagination>>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
type _UserSatisfiesClient = Expect<IsAssignable<Wire['User'], User>>;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
type _ProductListItemSatisfiesClient = Expect<IsAssignable<Wire['ProductListItem'], ApiProduct>>;
type _CategorySatisfiesClient = Expect<IsAssignable<Wire['Category'], Category>>;
type _BrandSatisfiesClient = Expect<IsAssignable<Wire['Brand'], Brand>>;

// ---------------------------------------------------------------------------
// Addresses
//
// These payloads are snake_case on both sides, unlike the rest of the API. The
// assertion pins that down: switching one side to camelCase breaks the build.
// ---------------------------------------------------------------------------
type _AddressSatisfiesClient = Expect<
  IsAssignable<Wire['Address'], Omit<ApiAddressResponse, 'created_at' | 'updated_at'>>
>;

// A named export keeps this a module rather than a global script, and gives the
// file a reason to be imported by the type-only barrel below.
export type ConformanceChecked = true;
