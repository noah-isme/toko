# Quick Start Guide — Frontend Integration

> **Backend reference:** The authoritative quick start guide lives in [toko-api/docs/QUICK_START_FRONTEND.md](../../../toko-api/docs/QUICK_START_FRONTEND.md).
> **Last Updated:** 2026-08-07

This guide covers the **frontend-specific** integration points and existing implementations in the Toko storefront.

## 📦 Current Architecture

### Tech Stack

- **Framework:** Next.js 16 (App Router)
- **State:** Zustand (client) + TanStack Query (server)
- **API Client:** Custom `apiClient` in `src/lib/api/client.ts`
- **Auth:** JWT access token (memory) + HttpOnly refresh cookie
- **Mock Mode:** MSW handlers when `NEXT_PUBLIC_API_URL=mock`

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
# or production
# NEXT_PUBLIC_API_URL=https://api.toko.com/api/v1

# Mock mode (default in dev)
NEXT_PUBLIC_API_URL=mock
```

## 🔐 Authentication — Already Implemented

The storefront has a complete auth flow in `src/entities/auth/`:

| Feature              | Location                                                  |
| -------------------- | --------------------------------------------------------- |
| Login/Register pages | `src/app/(auth)/login/page.tsx`, `register/page.tsx`      |
| Token storage        | `src/lib/auth/tokenStore.ts` (memory + localStorage sync) |
| Auto-refresh         | `src/lib/auth/tokenRefresh.ts` (14-min interval)          |
| Logout               | `src/lib/auth/logout.ts`                                  |
| Protected routes     | `src/middleware.ts`                                       |

**Usage:**

```tsx
// Server component - get user
import { getUser } from '@/entities/auth/api';
const user = await getUser();

// Client component - use hook
import { useAuth } from '@/entities/auth/hooks';
const { user, login, logout, isLoading } = useAuth();
```

## 🛒 Cart Management — Already Implemented

Guest + user cart flow in `src/entities/cart/`:

```tsx
import { useCart } from '@/entities/cart/hooks';

// Add item
await useCart.getState().addItem(productId, qty, variantId);

// Apply voucher
await useCart.getState().applyVoucher('DISC20');

// Merge guest → user cart (auto-called after login)
await useCart.getState().mergeCart();
```

## 📦 Product Catalog — Already Implemented

TanStack Query hooks in `src/entities/catalog/hooks.ts`:

```tsx
import { useProducts, useProduct, useCategories, useBrands } from '@/entities/catalog/hooks';

// List with filters
const { data, isLoading } = useProducts({
  category: 'smartphones',
  minPrice: 5_000_000,
  sort: 'price:asc',
  page: 1,
  limit: 20,
});

// Single product detail (by slug)
const { data: product } = useProduct('samsung-galaxy-s24');

// Search
const { data: results } = useProducts({ q: 'samsung', limit: 10 });
```

## 🛍️ Checkout Flow — Already Implemented

Complete flow in `src/entities/checkout/`:

```tsx
import { useCheckout } from '@/entities/checkout/hooks';

const { mutate: checkout, isPending } = useCheckout();

await checkout({
  cartId: 'cart-uuid',
  shippingAddressId: 'addr-uuid',
  shippingService: 'jne-reg',
  shippingCost: 15_000,
  paymentMethod: 'bank_transfer',
  notes: 'Call before delivery',
});
// Redirects to payment URL automatically
```

## 📱 Order Management — Already Implemented

```tsx
import { useOrders, useOrder, useOrderShipment } from '@/entities/orders/hooks';

// List orders
const { data } = useOrders({ page: 1, limit: 10 });

// Order detail
const { data: order } = useOrder('order-uuid');

// Shipment tracking
const { data: shipment } = useOrderShipment('order-uuid');
```

## 🎫 Voucher & Promotions — Already Implemented

```tsx
import { useVouchers, useFlashSales } from '@/entities/promo/hooks';

const { data: vouchers } = useVouchers();
const { data: flashSales } = useFlashSales();
```

## 🔔 Push Notifications — Already Implemented

```tsx
import { usePushPreferences, usePushSubscription } from '@/entities/web-push/hooks';

const { data: prefs } = usePushPreferences();
const { mutate: subscribe } = usePushSubscription();
```

## 📝 Returns & Support — Already Implemented

```tsx
import { useCreateReturn, useReturns, useCreateTicket } from '@/entities/customer-operations/hooks';

await useCreateReturn.mutateAsync({ orderId, reason, items });
const { data: returns } = useReturns();
await useCreateTicket.mutateAsync({ subject, message });
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/account/push-settings/page.test.tsx

# Run with coverage
npm test -- --coverage
```

### Mock Mode

Default in development. MSW handlers in `src/mocks/handlers/` intercept all API calls.

```bash
# Use real backend
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 npm run dev
```

## 📊 Performance — React Query Config

Default config in `src/lib/query/client.ts`:

- `staleTime`: 60s
- `cacheTime`: 5min
- `retry`: 1
- `refetchOnWindowFocus`: false

## 🔧 Key Files Reference

| Area         | File                         |
| ------------ | ---------------------------- |
| API Client   | `src/lib/api/client.ts`      |
| Auth Store   | `src/entities/auth/store.ts` |
| Cart Store   | `src/entities/cart/store.ts` |
| Query Client | `src/lib/query/client.ts`    |
| Middleware   | `src/middleware.ts`          |
| MSW Handlers | `src/mocks/handlers/`        |
| Types        | `src/entities/*/types.ts`    |

## 📖 Next Steps

1. **Read backend guide** for complete API examples: [QUICK_START_FRONTEND.md](../../../toko-api/docs/QUICK_START_FRONTEND.md)
2. **Explore entity hooks** in `src/entities/*/hooks.ts`
3. **Check contract docs** in `docs/contracts/` for API details
4. **Run tests** to verify integrations work
