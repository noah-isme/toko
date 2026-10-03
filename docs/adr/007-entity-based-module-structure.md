# ADR 007: Entity-Based Module Structure

## Status

Accepted — migration completed 2026-10-04

## Context

As the storefront grew, the flat `src/lib/api/` directory became unwieldy with dozens of hooks and services for different domains (cart, orders, reviews, search, etc.).

## Decision

Introduce `src/entities/` with subdirectories per business domain. Each entity folder co-locates its types, schemas, hooks, API service, and sometimes components:

```
src/entities/
├── address/    (types, schemas, hooks, AddressForm, AddressBook)
├── auth/       (schemas, useAuth hook)
├── admin/      (types, API, hooks, formatters)
├── cart/       (hooks)
├── catalog/    (keys, hooks)
├── checkout/   (hooks, API)
├── notifications/ (keys, hooks)
├── orders/     (keys, hooks, API)
├── reviews/    (hooks, API)
└── ...         (14 entities total)
```

`src/lib/api/` keeps the transport (`apiClient`), services, mappers, shared types, utilities and the cross-domain `queryKeys`; it exports no hooks.

### Migration completed 2026-10-04

The legacy `src/lib/api/hooks.ts`, `src/lib/api/hooks.react-query.ts` and `src/lib/api/hooks.admin.ts` were removed. Their hooks moved to `src/entities/{admin,catalog,cart,notifications,orders}/` with query-key values unchanged; hooks without call sites were deleted. An ESLint `no-restricted-imports` rule rejects `@/lib/api/hooks*` so the dual location cannot return.

## Consequences

- **Positive:** Domain logic is discoverable — find everything related to "orders" in one folder.
- **Positive:** Reduces cognitive load when working on a single feature.
- **Negative (resolved 2026-10-04):** Dual location of hooks (entities vs. lib/api) during migration created confusion. The migration is complete and guarded by ESLint.
