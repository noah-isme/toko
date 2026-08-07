# Analytics Endpoints

> **Canonical contract:** The authoritative contract lives in the [backend analytics documentation](../../../toko-api/docs/contracts/analytics.md).

> **Last Updated:** 2026-08-07

Analytics endpoints are **admin-only** and are **intentionally not exposed** through the storefront frontend. This is a deliberate design decision: the admin dashboard (a separate surface) consumes these endpoints, while the customer-facing storefront has no analytics entity at this time.

For backend contract details including query parameters, response shapes, and error codes, see the [backend analytics documentation](../../../toko-api/docs/contracts/analytics.md).

## 9.1 Get Sales Analytics (Admin)

```http
GET /api/v1/analytics/sales
Authorization: Bearer <admin_token>
```

Admin-only. Returns daily sales aggregates. See the backend contract for query parameters (`from`, `to`, `days`) and response shape.

## 9.2 Get Top Products (Admin)

```http
GET /api/v1/analytics/top-products
Authorization: Bearer <admin_token>
```

Admin-only. Returns top-selling products ordered by quantity sold. See the backend contract for query parameters (`limit`, `offset`) and response shape.

## 9.3 Overview (Admin)

```http
GET /api/v1/analytics/overview
Authorization: Bearer <admin_token>
```

Admin-only. Returns the configured date-range summary with revenue, order counts, paid order counts, and average order value. See the backend contract for the response shape.
