# Toko API Integration

Complete TypeScript API client implementation for the Toko e-commerce platform.

## Features

- ✅ Full TypeScript support with type safety
- ✅ Automatic token refresh
- ✅ React Query hooks for caching and state management
- ✅ Zustand store for cart management
- ✅ Authentication context provider
- ✅ Guest cart with merge functionality
- ✅ Comprehensive error handling
- ✅ Indonesian localization

## API Services

### Authentication (`authApi`)

- `register()` - Register new user
- `login()` - Login with email/password
- `logout()` - Logout current user
- `getCurrentUser()` - Get authenticated user
- `refresh()` - Refresh access token
- `forgotPassword()` - Request password reset
- `resetPassword()` - Reset password with token

### Catalog (`catalogApi`)

- `getCategories()` - List all categories
- `getBrands()` - List all brands
- `getProducts(filters?)` - List products with filters
- `getProduct(slug)` - Get product details
- `getRelatedProducts(slug)` - Get related products

### Cart (`cartApi`)

- `createCart()` - Create guest cart
- `getCart(cartId)` - Get cart details
- `addItem()` - Add item to cart
- `updateItem()` - Update item quantity
- `removeItem()` - Remove item from cart
- `applyVoucher()` - Apply discount voucher
- `removeVoucher()` - Remove voucher
- `getShippingQuote()` - Get shipping rates
- `getTaxQuote()` - Get tax calculation
- `mergeCart()` - Merge guest cart to user cart

### Orders (`ordersApi`)

- `checkout()` - Create order from cart
- `getOrders()` - List user orders
- `getOrder(orderId)` - Get order details
- `cancelOrder(orderId)` - Cancel order
- `getShipment(orderId)` - Track shipment

### Address (`addressApi`)

- `getAddresses()` - List user addresses
- `createAddress()` - Create new address
- `updateAddress()` - Update address
- `deleteAddress()` - Delete address

## React Hooks

All services have corresponding React Query hooks:

```typescript
import { useProducts, useCart, useCheckout } from '@/lib/api';

// Fetch products with filters
const { data, isLoading, error } = useProducts({
  category: 'electronics',
  minPrice: 100000,
  sort: 'price:asc',
});

// Get cart
const { data: cart } = useCart(cartId);

// Add to cart with mutation
const addToCart = useAddToCart(cartId);
addToCart.mutate({ productId: 'xxx', qty: 1 });
```

## Cart Management

Use the Zustand cart store for managing cart state:

```typescript
import { useCartStore } from '@/stores/cart-store';

function CartButton() {
  const { cartId, initGuestCart } = useCartStore();

  // Initialize cart for guest users
  useEffect(() => {
    if (!cartId) {
      initGuestCart();
    }
  }, [cartId]);

  return <button>Cart</button>;
}
```

## Authentication

Use the AuthProvider for managing auth state:

```typescript
// app/layout.tsx
import { AuthProvider } from '@/components/providers/AuthProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// Any component
import { useAuth } from '@/components/providers/AuthProvider';

function Profile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Guest to Authenticated Flow

The cart automatically merges when a guest user logs in:

```typescript
const { login } = useAuth();
const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

async function handleLogin(email: string, password: string) {
  await login({ email, password });
  // Cart is automatically merged in AuthProvider
  router.push('/');
}
```

## Utilities

```typescript
import {
  formatCurrency,
  formatDate,
  getErrorMessage
} from '@/lib/api';

// Format currency
formatCurrency(12000000); // "Rp 12.000.000"

// Format date
formatDate('2025-12-07T10:00:00Z'); // "7 Desember 2025"

// Get user-friendly error messages
try {
  await api.addToCart(...);
} catch (error) {
  toast.error(getErrorMessage(error));
}
```

## Constants

```typescript
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PRODUCT_SORT_OPTIONS } from '@/lib/api';

// Display order status
const status = ORDER_STATUS_LABELS[order.status];
// { label: 'Dikirim', color: 'purple', icon: 'truck' }

// Payment method label
PAYMENT_METHOD_LABELS['bank_transfer']; // "Transfer Bank"
```

## Environment Variables

Add to `.env.local`:

```bash
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# For production
NEXT_PUBLIC_API_URL=https://api.toko.com/api/v1
```

## Error Handling

The API client provides comprehensive error handling:

```typescript
import { ApiClientError, getErrorMessage } from '@/lib/api';

try {
  await cartApi.addItem(cartId, data);
} catch (error) {
  if (error instanceof ApiClientError) {
    // Access error details
    console.log(error.code); // 'OUT_OF_STOCK'
    console.log(error.status); // 400
    console.log(error.message); // 'Product is out of stock'
  }

  // Get localized error message
  toast.error(getErrorMessage(error));
}
```

## Type Safety

All API responses are fully typed:

```typescript
import type { Product, Cart, Order } from '@/lib/api';

const product: Product = await catalogApi.getProduct('samsung-s24');
const cart: Cart = await cartApi.getCart(cartId);
const order: Order = await ordersApi.getOrder(orderId);
```

## Testing

The API client uses the same fetch-based infrastructure, making it easy to mock:

```typescript
// vitest.setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/products', () => {
    return HttpResponse.json({
      data: [
        /* mock products */
      ],
      pagination: { page: 1, perPage: 20, totalItems: 100 },
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## License

MIT
