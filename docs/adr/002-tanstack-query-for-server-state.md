# ADR 002: TanStack React Query for Server State

## Status

Accepted

## Context

The storefront fetches data from the Toko REST API for products, orders, cart, reviews, and dozens of other resources. Managing cache invalidation, refetching, loading/error states, and optimistic updates manually would be error-prone and verbose.

## Decision

Adopt TanStack React Query v5 as the server-state manager. All API data flows through custom hooks (`useProducts`, `useCart`, `useAdminOrders`, etc.) that wrap `useQuery` / `useMutation` with the centralized `apiClient`.

## Consequences

- **Positive:** Automatic background refetching, request deduplication, and stale-while-revalidate caching reduce boilerplate significantly.
- **Positive:** DevTools (`@tanstack/react-query-devtools`) aid debugging in development.
- **Negative:** Adds a runtime dependency (~13 KB gzipped). Developers must understand query key conventions and invalidation patterns.
