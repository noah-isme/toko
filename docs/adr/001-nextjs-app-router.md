# ADR 001: Use Next.js App Router

## Status

Accepted

## Context

The storefront needs server-side rendering for SEO, file-based routing for developer productivity, and edge middleware for locale rewriting. Next.js App Router (introduced in Next.js 13, stabilized in 14+) provides all three with React Server Components support.

## Decision

Use Next.js App Router with route groups `(storefront)` and `(admin)` to cleanly separate customer-facing and admin layouts. Each group has its own `layout.tsx` with independent navigation and providers.

## Consequences

- **Positive:** Native streaming SSR, nested layouts, parallel routes, built-in image optimization, strong community ecosystem.
- **Positive:** Edge middleware enables locale rewriting without a separate proxy.
- **Negative:** App Router has a steeper learning curve than Pages Router. Some third-party libraries require "use client" boundaries.
- **Note:** Production builds use Turbopack since ADR-009 replaced the webpack-only `@ducanh2912/next-pwa` with `@serwist/turbopack`.
