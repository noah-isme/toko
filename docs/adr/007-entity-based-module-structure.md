# ADR 007: Entity-Based Module Structure

## Status

Accepted

## Context

As the storefront grew, the flat `src/lib/api/` directory became unwieldy with dozens of hooks and services for different domains (cart, orders, reviews, search, etc.).

## Decision

Introduce `src/entities/` with subdirectories per business domain. Each entity folder co-locates its types, schemas, hooks, API service, and sometimes components:

```
src/entities/
├── address/    (types, schemas, hooks, AddressForm, AddressBook)
├── auth/       (schemas, useAuth hook)
├── cart/       (hooks)
├── checkout/   (hooks, API)
├── orders/     (hooks, API)
├── reviews/    (hooks, API)
└── ...         (14 entities total)
```

The legacy `src/lib/api/hooks.react-query.ts` and `src/lib/api/hooks.admin.ts` remain for hooks that haven't been migrated yet.

## Consequences

- **Positive:** Domain logic is discoverable — find everything related to "orders" in one folder.
- **Positive:** Reduces cognitive load when working on a single feature.
- **Negative:** Dual location of hooks (entities vs. lib/api) during migration creates confusion. Migration should be completed.
