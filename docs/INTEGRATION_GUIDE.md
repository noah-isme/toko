# Quick Integration Guide

Panduan cepat untuk mengintegrasikan API ke aplikasi Toko.

## 1. Setup Providers

Tambahkan di `app/layout.tsx` atau root layout:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/providers/AuthProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## 2. Environment Variables

Buat file `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Production
# NEXT_PUBLIC_API_URL=https://api.toko.com/api/v1
```

## 3. Example Components

### Login Form

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      router.push('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

### Product List

```typescript
'use client';

import { useProducts, formatCurrency } from '@/lib/api';
import { useState } from 'react';

export function ProductList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useProducts({
    page,
    limit: 20,
    sort: 'price:asc',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        {data?.data.map((product) => (
          <div key={product.id} className="border p-4">
            <img src={product.imageUrl} alt={product.title} />
            <h3>{product.title}</h3>
            <p>{formatCurrency(product.price)}</p>
            <button>Add to Cart</button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Cart Component

```typescript
'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useCart, useRemoveCartItem, formatCurrency } from '@/lib/api';

export function Cart() {
  const { cartId, initGuestCart } = useCartStore();
  const { data: cart, isLoading } = useCart(cartId);
  const removeItem = useRemoveCartItem(cartId || '');

  // Initialize guest cart
  useEffect(() => {
    if (!cartId) {
      initGuestCart();
    }
  }, [cartId, initGuestCart]);

  if (isLoading) return <div>Loading cart...</div>;
  if (!cart) return <div>Cart is empty</div>;

  return (
    <div>
      <h2>Shopping Cart</h2>

      {cart.items.map((item) => (
        <div key={item.id} className="flex items-center gap-4 p-4 border-b">
          <img src={item.imageUrl} alt={item.title} className="w-20 h-20" />
          <div className="flex-1">
            <h3>{item.title}</h3>
            <p>Qty: {item.qty}</p>
            <p>{formatCurrency(item.unitPrice)} × {item.qty}</p>
          </div>
          <p className="font-bold">
            {formatCurrency(item.subtotal)}
          </p>
          <button
            onClick={() => removeItem.mutate(item.id)}
            disabled={removeItem.isPending}
          >
            Remove
          </button>
        </div>
      ))}

      <div className="mt-4 p-4 bg-gray-100">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(cart.pricing.subtotal)}</span>
        </div>
        {cart.pricing.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>-{formatCurrency(cart.pricing.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>{formatCurrency(cart.pricing.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping:</span>
          <span>{formatCurrency(cart.pricing.shipping)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
          <span>Total:</span>
          <span>{formatCurrency(cart.pricing.total)}</span>
        </div>
      </div>

      <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded">
        Checkout
      </button>
    </div>
  );
}
```

### Add to Cart Button

```typescript
'use client';

import { useCartStore } from '@/stores/cart-store';
import { useAddToCart } from '@/lib/api';
import { useEffect } from 'react';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
}

export function AddToCartButton({ productId, variantId }: AddToCartButtonProps) {
  const { cartId, initGuestCart } = useCartStore();
  const addToCart = useAddToCart(cartId || '');

  useEffect(() => {
    if (!cartId) {
      initGuestCart();
    }
  }, [cartId, initGuestCart]);

  const handleAddToCart = async () => {
    if (!cartId) {
      await initGuestCart();
      return;
    }

    try {
      await addToCart.mutateAsync({
        productId,
        variantId: variantId || null,
        qty: 1,
      });
      alert('Added to cart!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={addToCart.isPending}
      className="bg-blue-600 text-white px-6 py-2 rounded"
    >
      {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Checkout Page

```typescript
'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useCheckout, useAddresses, formatCurrency } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartId } = useCartStore();
  const { data: addresses } = useAddresses();
  const checkout = useCheckout();

  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'ewallet_gopay'>('bank_transfer');

  const handleCheckout = async () => {
    if (!cartId || !selectedAddress) return;

    try {
      const result = await checkout.mutateAsync({
        cartId,
        shippingAddressId: selectedAddress,
        shippingService: 'jne-reg',
        shippingCost: 15000,
        paymentMethod,
      });

      // Redirect to payment page
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        router.push(`/orders/${result.orderId}`);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Shipping Address */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
        {addresses?.data.map((address) => (
          <label key={address.id} className="block p-4 border rounded mb-2 cursor-pointer">
            <input
              type="radio"
              name="address"
              value={address.id}
              checked={selectedAddress === address.id}
              onChange={(e) => setSelectedAddress(e.target.value)}
              className="mr-3"
            />
            <span className="font-medium">{address.label}</span>
            <p className="text-sm text-gray-600 ml-6">
              {address.addressLine1}, {address.city}, {address.province} {address.postalCode}
            </p>
          </label>
        ))}
      </div>

      {/* Payment Method */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
        <label className="block p-4 border rounded mb-2 cursor-pointer">
          <input
            type="radio"
            name="payment"
            value="bank_transfer"
            checked={paymentMethod === 'bank_transfer'}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="mr-3"
          />
          Bank Transfer
        </label>
        <label className="block p-4 border rounded mb-2 cursor-pointer">
          <input
            type="radio"
            name="payment"
            value="ewallet_gopay"
            checked={paymentMethod === 'ewallet_gopay'}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="mr-3"
          />
          GoPay
        </label>
      </div>

      <button
        onClick={handleCheckout}
        disabled={!selectedAddress || checkout.isPending}
        className="w-full bg-blue-600 text-white py-3 rounded font-semibold disabled:opacity-50"
      >
        {checkout.isPending ? 'Processing...' : 'Place Order'}
      </button>
    </div>
  );
}
```

### Order List

```typescript
'use client';

import { useOrders, formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/api';
import Link from 'next/link';

export function OrderList() {
  const { data, isLoading } = useOrders();

  if (isLoading) return <div>Loading orders...</div>;
  if (!data?.data.length) return <div>No orders yet</div>;

  return (
    <div className="space-y-4">
      {data.data.map((order) => {
        const statusInfo = ORDER_STATUS_LABELS[order.status];

        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block border rounded p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {order.itemCount} item(s)
              </p>
              <p className="font-bold">
                {formatCurrency(order.total)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
```

## 4. Error Handling

```typescript
import { getErrorMessage, ApiClientError } from '@/lib/api';

try {
  await someApiCall();
} catch (error) {
  if (error instanceof ApiClientError) {
    // Specific error codes
    if (error.code === 'OUT_OF_STOCK') {
      alert('Product is out of stock');
    } else if (error.code === 'UNAUTHORIZED') {
      router.push('/login');
    } else {
      alert(getErrorMessage(error));
    }
  } else {
    alert('An unexpected error occurred');
  }
}
```

## 5. Utilities

```typescript
import { formatCurrency, formatDate, formatPhoneNumber, calculateDiscountPercent } from '@/lib/api';

// Currency
formatCurrency(12000000); // "Rp 12.000.000"

// Date
formatDate('2025-12-07T10:00:00Z'); // "7 Desember 2025"

// Phone
formatPhoneNumber('081234567890'); // "+6281234567890"

// Discount
calculateDiscountPercent(15000000, 12000000); // 20
```

Selamat coding! 🎉
