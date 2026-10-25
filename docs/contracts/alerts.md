# Product Alerts

> **Canonical contract:** The authoritative contract lives in the [backend alerts documentation](../../../toko-api/docs/contracts/alerts.md).

> **Last Updated:** 2026-10-25

Back-in-stock and price-drop subscriptions for the signed-in shopper. All
endpoints require a Bearer token and are tenant-scoped. Prices are whole rupiah.

Base path: `/api/v1/alerts`

| Method   | Path           | Purpose                                                                   |
| -------- | -------------- | ------------------------------------------------------------------------- |
| `GET`    | `/alerts`      | List my subscriptions, newest first (`page`, `limit` ≤ 100, `productId`). |
| `POST`   | `/alerts`      | Subscribe (`201`) or re-arm an existing one (`200`).                      |
| `DELETE` | `/alerts/{id}` | Delete one of my subscriptions (`204`).                                   |

## Subscribe

```http
POST /api/v1/alerts
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "uuid", "variantId": "uuid (optional)", "type": "BACK_IN_STOCK" }
```

Response `{ "data": AlertSubscription }`. Errors: `400 BAD_REQUEST`, `401`,
`404 NOT_FOUND` (product not in tenant / variant not of product) and
`409 ALREADY_IN_STOCK`.

**Sellable rule** (same as the cart): a variant is sellable when its `stock > 0`
(the product's `inStock` is ignored); a product-level target is sellable when
`inStock` is true. `BACK_IN_STOCK` for a sellable target answers 409, so the
storefront only offers "Notify me" when the target is not sellable
(`isTargetSellable` in `src/entities/alerts/sellable.ts`). The add-to-cart
button follows the same rule.

## AlertSubscription

```json
{
  "id": "uuid",
  "productId": "uuid",
  "variantId": null,
  "type": "PRICE_DROP",
  "priceAtSubscribe": 250000,
  "status": "active",
  "notifiedAt": null,
  "createdAt": "2026-10-20T09:00:00Z",
  "product": {
    "title": "Oak Chair",
    "slug": "oak-chair",
    "thumbnail": null,
    "price": 250000,
    "inStock": true
  }
}
```

`variant` (`{ id, sku, price, stock }`) is present only when `variantId` is set.
`priceAtSubscribe` is `null` for `BACK_IN_STOCK`. `status` is `active` or
`notified`; a notified alert is re-armed by posting the same target again.

## Delivery

An alert fires once, about 15 seconds after the target becomes sellable or
cheaper: an in-app notification (type `back_in_stock` / `price_drop`, `data`
carries `productId`, `variantId`, `slug`, `title`, `price`, `subscriptionId`
and, for price drops, `previousPrice`) plus a queued, retried email. The
storefront links these notifications to `/products/{slug}`. Alerts are never
sent to webhooks.

## Frontend usage

| Where             | What                                                          |
| ----------------- | ------------------------------------------------------------- |
| Product detail    | `BackInStockAlert` for a sold-out variant or product.         |
| Favorites         | `PriceDropToggle` (product-level `PRICE_DROP`) per favorite.  |
| `/account/alerts` | "My alerts": list, remove, re-arm, pagination.                |
| Signed out        | `AlertLoginPrompt` links to `/login?redirect=<current page>`. |

Data layer: `src/entities/alerts/` (`api.ts`, `hooks.ts`, `keys.ts`). Mocks:
`src/mocks/resolvers/alerts.ts`, shared by `src/mocks/handlers.alerts.ts` (MSW)
and the `/api/v1` route.
