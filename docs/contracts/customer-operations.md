# Returns & Support — Frontend Contract

> **Canonical contract:** The authoritative contract lives in the [backend customer-operations documentation](../../../toko-api/docs/contracts/customer-operations.md).

> **Last Updated:** 2026-08-07

Frontend consumes returns and support through the `customerOperations` entity module. All routes require authentication.

## API Surface

### Returns

| Method | Path                         | Auth | Frontend Function |
| ------ | ---------------------------- | ---- | ----------------- |
| POST   | `/orders/{orderId}/returns`  | Yes  | `createReturn()`  |
| GET    | `/returns`                   | Yes  | `getReturns()`    |
| GET    | `/returns/{returnId}`        | Yes  | `getReturn()`     |
| PATCH  | `/returns/{returnId}/cancel` | Yes  | `cancelReturn()`  |

### Support Tickets

| Method | Path                                   | Auth | Frontend Function     |
| ------ | -------------------------------------- | ---- | --------------------- |
| POST   | `/support/tickets`                     | Yes  | `createTicket()`      |
| GET    | `/support/tickets`                     | Yes  | `getTickets()`        |
| GET    | `/support/tickets/{ticketId}`          | Yes  | `getTicket()`         |
| GET    | `/support/tickets/{ticketId}/messages` | Yes  | `getTicketMessages()` |
| POST   | `/support/tickets/{ticketId}/messages` | Yes  | `sendTicketMessage()` |
| PATCH  | `/support/tickets/{ticketId}/close`    | Yes  | `closeTicket()`       |

---

## Request / Response Contracts

### Returns

#### Create Return

```http
POST /api/v1/orders/{orderId}/returns
Authorization: Bearer <token>
Content-Type: application/json
```

**Request (`CreateReturnInput`):**

```typescript
{
  orderItemId: string;        // UUID of the order item to return
  reason: 'defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'size_issue' | 'other';
  description?: string;       // Optional additional details (max 1000 chars)
  images?: string[];          // Optional array of image URLs (max 5)
  desiredResolution: 'refund' | 'exchange' | 'store_credit';
  exchangeVariantId?: string; // Required if desiredResolution is 'exchange'
}
```

**Response:** `201 Created`

```typescript
{
  data: {
    id: string;               // Return UUID
    orderId: string;
    orderItemId: string;
    userId: string;
    reason: string;
    description: string | null;
    images: string[];
    desiredResolution: string;
    exchangeVariantId: string | null;
    status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'exchanged' | 'cancelled';
    adminNotes: string | null;
    refundAmount: number | null;
    createdAt: string;        // ISO datetime
    updatedAt: string;        // ISO datetime
  }
}
```

**Error codes:**

- `ORDER_NOT_FOUND` — Order doesn't exist
- `ORDER_ITEM_NOT_FOUND` — Order item doesn't exist
- `ALREADY_RETURNED` — Item already has a return request
- `RETURN_WINDOW_EXPIRED` — Past the return eligibility window (typically 30 days)
- `INVALID_RESOLUTION` — Exchange requested but no variant provided

---

#### List Returns

```http
GET /api/v1/returns?page=1&limit=20&status=approved
Authorization: Bearer <token>
```

**Query parameters:**

- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `status` (optional): Filter by return status

**Response:** `200 OK`

```typescript
{
  data: [
    {
      id: string;
      orderId: string;
      orderItemId: string;
      userId: string;
      reason: string;
      description: string | null;
      images: string[];
      desiredResolution: string;
      exchangeVariantId: string | null;
      status: string;
      adminNotes: string | null;
      refundAmount: number | null;
      createdAt: string;
      updatedAt: string;
      // Frontend-only: populated from order item
      orderItem?: {
        productId: string;
        productName: string;
        productSlug: string;
        variantName: string | null;
        quantity: number;
        price: number;
        thumbnail: string;
      };
    }
  ],
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
  }
}
```

---

#### Get Return Detail

```http
GET /api/v1/returns/{returnId}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```typescript
{
  data: {
    id: string;
    orderId: string;
    orderItemId: string;
    userId: string;
    reason: string;
    description: string | null;
    images: string[];
    desiredResolution: string;
    exchangeVariantId: string | null;
    status: string;
    adminNotes: string | null;
    refundAmount: number | null;
    createdAt: string;
    updatedAt: string;
    orderItem: {
      productId: string;
      productName: string;
      productSlug: string;
      variantName: string | null;
      quantity: number;
      price: number;
      thumbnail: string;
    };
    // Timeline of status changes
    timeline: [
      { status: 'requested', at: string, by: 'customer' },
      { status: 'approved', at: string, by: 'admin', note: 'Return approved' },
      { status: 'received', at: string, by: 'warehouse' },
      { status: 'refunded', at: string, by: 'admin', refundAmount: 150000 }
    ]
  }
}
```

---

#### Cancel Return

```http
PATCH /api/v1/returns/{returnId}/cancel
Authorization: Bearer <token>
```

Only allowed when status is `requested` or `approved` (before warehouse receives).

**Response:** `200 OK`

```typescript
{
  data: {
    id: string;
    status: 'cancelled';
    // ... other fields
  }
}
```

**Error codes:**

- `INVALID_STATE` — Cannot cancel return in current status

---

### Support Tickets

#### Create Ticket

```http
POST /api/v1/support/tickets
Authorization: Bearer <token>
Content-Type: application/json
```

**Request (`CreateTicketInput`):**

```typescript
{
  subject: string;              // Max 200 chars
  category: 'order' | 'payment' | 'shipping' | 'product' | 'account' | 'technical' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  description: string;          // Max 5000 chars
  orderId?: string;             // Optional related order
  attachments?: string[];       // Optional image/file URLs (max 5)
}
```

**Response:** `201 Created`

```typescript
{
  data: {
    id: string;                 // Ticket UUID
    userId: string;
    subject: string;
    category: string;
    priority: string;
    status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
    description: string;
    orderId: string | null;
    attachments: string[];
    assignedAgentId: string | null;
    createdAt: string;
    updatedAt: string;
    firstResponseAt: string | null;
    resolvedAt: string | null;
  }
}
```

---

#### List Tickets

```http
GET /api/v1/support/tickets?page=1&limit=20&status=open
Authorization: Bearer <token>
```

**Query parameters:**

- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `status` (optional): Filter by ticket status
- `category` (optional): Filter by category

**Response:** `200 OK`

```typescript
{
  data: [
    {
      id: string;
      userId: string;
      subject: string;
      category: string;
      priority: string;
      status: string;
      description: string;
      orderId: string | null;
      attachments: string[];
      assignedAgentId: string | null;
      createdAt: string;
      updatedAt: string;
      firstResponseAt: string | null;
      resolvedAt: string | null;
      // Frontend-only: last message preview
      lastMessage?: {
        id: string;
        body: string;
        senderType: 'customer' | 'agent';
        createdAt: string;
      };
      unreadCount: number;
    }
  ],
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
  }
}
```

---

#### Get Ticket Detail

```http
GET /api/v1/support/tickets/{ticketId}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```typescript
{
  data: {
    id: string;
    userId: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    description: string;
    orderId: string | null;
    attachments: string[];
    assignedAgentId: string | null;
    createdAt: string;
    updatedAt: string;
    firstResponseAt: string | null;
    resolvedAt: string | null;
  }
}
```

---

#### Get Ticket Messages (Chronological Transcript)

```http
GET /api/v1/support/tickets/{ticketId}/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Response:** `200 OK`

```typescript
{
  data: [
    {
      id: string;
      ticketId: string;
      senderId: string;
      senderType: 'customer' | 'agent';
      senderName: string;           // Customer name or agent name
      body: string;
      attachments: string[];
      isInternal: boolean;          // Internal agent notes (hidden from customer)
      createdAt: string;
    }
  ],
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
  }
}
```

---

#### Send Ticket Message

```http
POST /api/v1/support/tickets/{ticketId}/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```typescript
{
  body: string;                   // Max 5000 chars
  attachments?: string[];         // Optional (max 5)
}
```

**Response:** `201 Created`

```typescript
{
  data: {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: 'customer';
    senderName: string;
    body: string;
    attachments: string[];
    isInternal: false;
    createdAt: string;
  }
}
```

---

#### Close Ticket

```http
PATCH /api/v1/support/tickets/{ticketId}/close
Authorization: Bearer <token>
```

Customer can close their own resolved tickets.

**Response:** `200 OK`

```typescript
{
  data: {
    id: string;
    status: 'closed';
    // ... other fields
  }
}
```

**Error codes:**

- `TICKET_NOT_RESOLVED` — Cannot close ticket that isn't resolved
- `FORBIDDEN` — Not the ticket owner

---

## Frontend Hooks

- `useCreateReturn()` — Mutation for creating returns
- `useReturns()` — Query for listing returns
- `useReturn(id)` — Query for single return detail
- `useCancelReturn()` — Mutation for canceling returns
- `useCreateTicket()` — Mutation for creating support tickets
- `useTickets()` — Query for listing tickets
- `useTicket(id)` — Query for single ticket detail
- `useTicketMessages(ticketId)` — Query for ticket message transcript
- `useSendTicketMessage()` — Mutation for sending messages
- `useCloseTicket()` — Mutation for closing tickets

---

## Status Enums (Frontend Constants)

```typescript
export const RETURN_STATUS_LABELS = {
  requested: 'Diajukan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  received: 'Diterima Gudang',
  refunded: 'Dikembalikan',
  exchanged: 'Ditukar',
  cancelled: 'Dibatalkan',
} as const;

export const RETURN_REASON_LABELS = {
  defective: 'Rusak/Cacat',
  wrong_item: 'Barang Salah',
  not_as_described: 'Tidak Sesuai Deskripsi',
  changed_mind: 'Berubah Pikir',
  size_issue: 'Ukuran Tidak Cocok',
  other: 'Lainnya',
} as const;

export const TICKET_STATUS_LABELS = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  waiting_customer: 'Menunggu Balasan',
  resolved: 'Terkelola',
  closed: 'Ditutup',
} as const;

export const TICKET_CATEGORY_LABELS = {
  order: 'Pesanan',
  payment: 'Pembayaran',
  shipping: 'Pengiriman',
  product: 'Produk',
  account: 'Akun',
  technical: 'Teknis',
  other: 'Lainnya',
} as const;

export const TICKET_PRIORITY_LABELS = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
} as const;
```

---

## Frontend Pages

- `/returns` — List user's return requests (uses `useReturns`)
- `/returns/[returnId]` — Return detail with timeline (uses `useReturn`)
- `/account/support` — List support tickets (uses `useTickets`)
- `/account/support/[ticketId]` — Ticket detail + message thread (uses `useTicket`, `useTicketMessages`)

---

## Integration Notes

1. **Return eligibility**: The backend enforces a 30-day return window from delivery. Frontend should disable "Request Return" for items past this window.

2. **Image uploads**: Return images and ticket attachments should be uploaded to the media service first, then URLs passed in the create request.

3. **Real-time updates**: Ticket messages support WebSocket/push for real-time agent replies (see `push.md`).

4. **Admin workflows**: Admin return/support management is documented in `admin.md` and uses separate admin endpoints under `/api/v1/admin/`.
