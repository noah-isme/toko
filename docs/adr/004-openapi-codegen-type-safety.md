# ADR 004: OpenAPI Code-Gen Type Safety Pipeline

## Status

Accepted

## Context

The frontend consumes the `toko-api` REST API. Type drift between frontend and backend causes runtime errors that are hard to catch during development.

## Decision

Establish a type-safety pipeline:

1. `openapi.yaml` is the canonical API spec (synced from `toko-api` via `pnpm api:sync`).
2. `openapi-typescript` generates `schema.d.ts` from the spec.
3. `conformance.ts` contains compile-time type assertions ensuring hand-written client types match generated types.
4. CI runs `pnpm api:check` to verify `schema.d.ts` is up-to-date (no manual edits).

## Consequences

- **Positive:** Type mismatches between frontend and backend are caught at compile time, not runtime.
- **Positive:** Generated types serve as living documentation of the API surface.
- **Negative:** Requires a manual `pnpm api:sync` step when the backend spec changes. Automated sync is not yet in place.
