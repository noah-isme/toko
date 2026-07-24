# Payment Endpoints

## 6.1 Create or Reuse Payment Intent

```http
POST /api/v1/payments/intent
Content-Type: application/json
Authorization: Bearer <token>
```

**Request:**

```json
{
  "orderId": "order-uuid",
  "channel": "snap"
}
```

- `orderId` is required and must belong to the authenticated user.
- `channel` is optional and passed to the configured payment provider.

**Response:** `200 OK`

```json
{
  "data": {
    "provider": "midtrans",
    "token": "snap-token-123",
    "redirectUrl": "https://payment.example.com/pay/xxx",
    "expiresAt": "2025-12-08T10:00:00Z"
  }
}
```

- `provider` is always present.
- `token`, `redirectUrl`, and `expiresAt` are provider-dependent and may be omitted.

---

## 6.2 Get Consolidated Payment Status

```http
GET /api/v1/payments/{orderId}/status
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "data": {
    "status": "PAID"
  }
}
```

**Status values:** `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `REFUNDED`.

- A cancelled order maps to `FAILED`.
- A refunded payment maps to `REFUNDED`.
