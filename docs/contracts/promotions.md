# Promotions

The storefront uses server-owned promotion data; checkout remains the authority for voucher eligibility and final pricing.

- `GET /api/v1/vouchers` is consumed by `/vouchers` through `promotionsApi.listVouchers()`.
- `GET /api/v1/flash-sales` is consumed by `/flash-sales` through `promotionsApi.listFlashSales()`.
- Flash-sale prices, discount basis points, campaign timestamps, and remaining stock come from the API. Checkout reserves campaign quota atomically; the client does not fabricate campaign discounts, stock, or timers.
- Admin campaign creation, listing, retrieval, and status management are available through the backend admin contract (`GET /api/v1/admin/flash-sales`, `GET /api/v1/admin/flash-sales/{id}`, `POST /api/v1/admin/flash-sales`, `PATCH /api/v1/admin/flash-sales/{id}`).

Mock handlers mirror both public endpoints when `NEXT_PUBLIC_API_URL=mock`.
