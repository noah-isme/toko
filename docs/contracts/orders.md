# Order Management Endpoints

> **Canonical contract:** The authoritative contract lives in the [backend orders documentation](../../../toko-api/docs/contracts/orders.md).

> **Last Updated:** 2026-08-07

## 4.2 List User Orders

```http
GET /api/v1/orders?page=1&limit=20
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-20251207-001",
      "status": "shipped",
      "statusLabel": "Sedang Dikirim",
      "total": 21135000,
      "currency": "IDR",
      "itemCount": 2,
      "thumbnailUrl": "https://cdn.toko.com/products/s24.jpg",
      "paymentMethod": "bank_transfer",
      "createdAt": "2025-12-07T10:00:00Z",
      "updatedAt": "2025-12-07T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "totalItems": 5
  }
}
```

---

## 4.3 Get Order Detail

```http
GET /api/v1/orders/{orderId}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-20251207-001",
    "status": "shipped",
    "statusLabel": "Sedang Dikirim",
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productTitle": "Samsung Galaxy S24",
        "productSlug": "samsung-galaxy-s24",
        "variantName": "8GB/128GB - Black",
        "qty": 2,
        "unitPrice": 12000000,
        "subtotal": 24000000,
        "imageUrl": "https://cdn.toko.com/products/s24.jpg"
      }
    ],
    "shippingAddress": {
      "receiverName": "John Doe",
      "phone": "+6281234567890",
      "addressLine1": "Jl. Sudirman No. 123",
      "addressLine2": "Apt 45B",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postalCode": "12190",
      "country": "Indonesia"
    },
    "pricing": {
      "subtotal": 24000000,
      "discount": 4800000,
      "tax": 1920000,
      "shipping": 15000,
      "total": 21135000
    },
    "voucher": {
      "code": "DISC20",
      "discount": 4800000
    },
    "shipping": {
      "courier": "JNE",
      "service": "REG",
      "trackingNumber": "JP1234567890",
      "estimatedDelivery": "2-3 hari",
      "shippedAt": "2025-12-07T14:00:00Z"
    },
    "payment": {
      "method": "bank_transfer",
      "methodLabel": "Transfer Bank",
      "status": "paid",
      "paidAt": "2025-12-07T11:30:00Z",
      "paymentUrl": "https://payment.gateway.com/pay/xxx",
      "expiryAt": "2025-12-08T10:00:00Z"
    },
    "notes": "Please call before delivery",
    "currency": "IDR",
    "createdAt": "2025-12-07T10:00:00Z",
    "updatedAt": "2025-12-07T14:00:00Z",
    "statusHistory": [
      {
        "status": "pending_payment",
        "timestamp": "2025-12-07T10:00:00Z"
      },
      {
        "status": "paid",
        "timestamp": "2025-12-07T11:30:00Z"
      },
      {
        "status": "packed",
        "timestamp": "2025-12-07T12:00:00Z"
      },
      {
        "status": "shipped",
        "timestamp": "2025-12-07T13:00:00Z"
      },
      {
        "status": "out_for_delivery",
        "timestamp": "2025-12-07T14:00:00Z"
      }
    ]
  }
}
```

---

## 4.4 Cancel Order

```http
POST /api/v1/orders/{orderId}/cancel
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "data": {
    "orderId": "order-uuid",
    "status": "cancelled",
    "message": "Order cancelled successfully"
  }
}
```

**Notes:**

- Hanya bisa cancel order dengan status `pending_payment`
- Order yang sudah `packed`, `shipped`, `out_for_delivery`, atau `delivered` tidak bisa dicancel

---

## 4.5 Get Shipment Detail

```http
GET /api/v1/orders/{orderId}/shipment
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "data": {
    "orderId": "order-uuid",
    "trackingNumber": "JP1234567890",
    "courier": "JNE",
    "service": "REG",
    "status": "on_delivery",
    "statusLabel": "Dalam Pengiriman",
    "estimatedDelivery": "2-3 hari",
    "shippedAt": "2025-12-07T14:00:00Z",
    "tracking": [
      {
        "timestamp": "2025-12-07T14:00:00Z",
        "status": "picked_up",
        "location": "Jakarta Warehouse",
        "description": "Paket telah diambil kurir"
      },
      {
        "timestamp": "2025-12-07T16:30:00Z",
        "status": "in_transit",
        "location": "Jakarta Distribution Center",
        "description": "Paket dalam perjalanan"
      },
      {
        "timestamp": "2025-12-08T08:00:00Z",
        "status": "on_delivery",
        "location": "Jakarta Selatan",
        "description": "Paket sedang diantar ke alamat tujuan"
      }
    ]
  }
}
```

---

## 4.6 Download Invoice (PDF)

```http
GET /api/v1/orders/{orderId}/invoice
Authorization: Bearer <token>
```

Returns the backend-rendered invoice for one of the caller's orders as
`application/pdf` with `Content-Disposition: attachment; filename="INV-YYYY-NNNNNN.pdf"`
and `Cache-Control: private, no-store`. The invoice number is assigned on the
first download and never changes.

A new invoice is issued for `paid`, `packed`, `shipped`, `out_for_delivery` and
`delivered` orders; an invoice issued earlier stays downloadable after a
cancellation. Errors use the JSON envelope: `400 BAD_REQUEST`, `401`,
`404 NOT_FOUND` (other user or tenant), `409 INVOICE_NOT_AVAILABLE` (not paid,
or cancelled with no earlier invoice) and `500`.

**Frontend:** `InvoiceDownloadButton` (`src/entities/orders/ui/`) fetches the
PDF with `apiDownload` (same auth, tenant and error handling as `apiClient`),
saves it under the server filename and shows a toast per error code. When the
API is on another origin the backend must list `Content-Disposition` in
`Access-Control-Expose-Headers` for the filename to be readable; otherwise the
file is saved as `invoice-<orderNumber>.pdf`. The button appears on the order
detail page (paid-like and cancelled orders) and on the order confirmation page
(paid-like orders).
