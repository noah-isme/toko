# ADR 003: MSW for API Mocking

## Status

Accepted

## Context

Frontend development must not require a running backend. The mock layer needs to intercept network requests realistically (including during tests), support the full API surface, and be easy to extend as new endpoints are added.

## Decision

Use Mock Service Worker (MSW 2.x) with handlers organized by domain (`handlers.ts`, `handlers.reviews.ts`, `handlers.qa.ts`, `handlers.notifications.ts`, etc.). MSW is enabled by default in development (`NEXT_PUBLIC_API_MOCKING=true`) and in Vitest/Playwright test suites.

## Consequences

- **Positive:** Tests and development use the same HTTP interception — no separate mock server process, no test-only abstractions.
- **Positive:** Frontend team can work in parallel with backend without blocking on API availability.
- **Negative:** Mock handlers must be kept in sync with the real API contract. The `pnpm api:check` CI step helps catch drift in types, but mock response shapes require manual maintenance.
