# ADR 005: Zustand for Client-Side State

## Status

Accepted

## Context

Some state is purely client-side and does not come from the API: the cart selection before it's synced, product comparison picks, search history, and saved-for-later items. This state needs to survive page navigation and, in some cases, persist across sessions via localStorage.

## Decision

Use Zustand v5 for client-only state management. Each concern gets its own store:

- `cart-store.ts` — cart state and persistence
- `compare-store.ts` — product comparison selection (max 3)
- `saved-for-later-store.ts` — items saved from cart
- `search-store.ts` — recent search terms (last 8, persisted)

## Consequences

- **Positive:** Zustand is minimal (~1 KB), has no boilerplate (no reducers, no actions, no context providers), and has first-class `persist` middleware for localStorage.
- **Positive:** Clear separation from React Query (server state) prevents mixing concerns.
- **Negative:** Multiple small stores can lead to scattered state logic if not organized by domain.
