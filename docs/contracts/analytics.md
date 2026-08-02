# Analytics Endpoints

Analytics endpoints are **admin-only** and are not currently exposed through the storefront frontend. There is no frontend entity for analytics at this time.

For backend contract details, see the [backend analytics documentation](../../../toko-api/docs/contracts/analytics.md).

## 9.1 Get Sales Analytics

```http
GET /api/v1/analytics/sales
Authorization: Bearer <admin_token>
```

Admin-only. Returns daily sales aggregates. See the backend contract for query parameters and response shape.

## 9.2 Get Top Products

```http
GET /api/v1/analytics/top-products
Authorization: Bearer <admin_token>
```

Admin-only. Returns top-selling products ordered by quantity sold. See the backend contract for query parameters and response shape.

## 9.3 Overview

```http
GET /api/v1/analytics/overview
Authorization: Bearer <admin_token>
```

Admin-only. Returns the configured date-range summary with revenue, order counts, paid order counts, and average order value. See the backend contract for the response shape.
