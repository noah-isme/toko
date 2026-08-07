# TypeScript Types — Sync Strategy

> **Canonical types:** The authoritative shared TypeScript types live in the [backend types.ts](../../../toko-api/docs/types.ts).
> **Last Updated:** 2026-08-07

## Sync Strategy

The backend `toko-api/docs/types.ts` is the **single source of truth** for API contract types. The frontend maintains its own domain types in `src/entities/*/types.ts` that:

1. **Extend** backend API types with frontend-specific fields (UI helpers, Zod schemas, computed functions)
2. **Map** snake_case API responses to camelCase domain models via mapper functions (e.g., `mapApiLoyaltyProfile`)
3. **Add** frontend-only constructs (tier benefits, reward catalog, status label maps)

## Frontend Type Locations

| Domain   | File                             | Purpose                               |
| -------- | -------------------------------- | ------------------------------------- |
| Auth     | `src/entities/auth/types.ts`     | User, tokens, login/register schemas  |
| Cart     | `src/entities/cart/types.ts`     | Cart, items, pricing, voucher         |
| Catalog  | `src/entities/catalog/types.ts`  | Product, category, brand, filters     |
| Checkout | `src/entities/checkout/types.ts` | Checkout request/response             |
| Orders   | `src/entities/orders/types.ts`   | Order, status, shipment, history      |
| Loyalty  | `src/entities/loyalty/types.ts`  | Profile, transactions, tiers, rewards |
| QA       | `src/entities/qa/types.ts`       | Questions, answers, votes             |
| Web Push | `src/entities/web-push/types.ts` | Subscription, preferences, VAPID      |
| Reviews  | `src/entities/reviews/types.ts`  | Reviews, stats, rating                |
| Address  | `src/entities/address/types.ts`  | Address CRUD                          |
| Payment  | `src/entities/payment/types.ts`  | Payment intent, methods               |

## Sync Workflow

When backend API contracts change:

1. **Update** `toko-api/docs/types.ts` (source of truth)
2. **Regenerate** or manually update frontend API types in `src/entities/*/types.ts`
3. **Verify** mappers (`mapApi*`) still correctly transform snake_case → camelCase
4. **Run** frontend tests to catch breaking changes

## Type Mapping Convention

| Backend (API)  | Frontend (Domain) | Example              |
| -------------- | ----------------- | -------------------- |
| snake_case     | camelCase         | `user_id` → `userId` |
| `created_at`   | `createdAt`       | ISO datetime strings |
| `order_number` | `orderNumber`     | Human-readable IDs   |
| `status_label` | `statusLabel`     | UI display strings   |

## Shared Enums

The following enums are kept in sync between backend and frontend:

- `OrderStatus` — `pending_payment` | `paid` | `packed` | `shipped` | `out_for_delivery` | `delivered` | `cancelled`
- `PaymentMethod` — `bank_transfer` | `virtual_account` | `credit_card` | `ewallet_gopay` | `ewallet_ovo` | `ewallet_dana`
- `LoyaltyTier` — `bronze` | `silver` | `gold` | `platinum`
- `LoyaltyTransactionType` — `earned` | `redeemed` | `expired` | `adjusted` | `bonus`
- `QAStatus` — `pending` | `answered` | `rejected`
- `ShipmentStatus` — `pending` | `picked_up` | `in_transit` | `on_delivery` | `delivered` | `failed`
- `ApiErrorCode` — `UNAUTHORIZED` | `FORBIDDEN` | `NOT_FOUND` | `BAD_REQUEST` | `VALIDATION_ERROR` | `INTERNAL` | `UNAVAILABLE` | `CART_EXPIRED` | `OUT_OF_STOCK` | `VOUCHER_INVALID` | `VOUCHER_MIN_SPEND` | `VOUCHER_ALREADY_USED` | `RATE_LIMIT_EXCEEDED`

## Frontend-Only Types (Not in Backend)

These types are intentionally frontend-only and documented in respective entity `types.ts`:

- **TierBenefits / REWARD_CATALOG** — loyalty tier UI configuration
- **StatusLabel / ORDER_STATUS_LABELS / SHIPMENT_STATUS_LABELS** — UI display mappings
- **Zod schemas** — runtime validation for forms
- **Utility functions** — `calculateTierProgress`, `getNextTier`, etc.

## Adding a New Domain

1. Add API types to `toko-api/docs/types.ts`
2. Create `src/entities/{domain}/types.ts` with:
   - `Api*` interfaces matching backend snake_case
   - Domain interfaces in camelCase
   - Mapper functions: `mapApiXxxToXxx(api: ApiXxx): Xxx`
   - Zod schemas for forms
   - UI helpers (labels, constants)
