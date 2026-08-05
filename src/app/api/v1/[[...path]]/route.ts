import { NextRequest, NextResponse } from 'next/server';

import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS } from '@/mocks/data';

// Stable UUID generator from slug seed
function stableUuid(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = Math.abs(hash).toString(16).padEnd(32, 'a').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Map products to match API Contract v0.2.0 with stable IDs
const products = SEED_PRODUCTS.map((p) => {
  const category = SEED_CATEGORIES.find((c) => c.slug === p.category);
  const brand = SEED_BRANDS.find((b) => b.slug === p.brand);
  const id = stableUuid(p.slug);
  return {
    id,
    title: p.title,
    slug: p.slug,
    description: `Description for ${p.title}`,
    price: p.price,
    originalPrice: p.price * 1.2,
    discountPercent: 20,
    currency: 'IDR',
    categoryId: category?.id || p.category,
    categoryName: category?.name || p.category,
    brandId: brand?.id || p.brand,
    brandName: brand?.name || p.brand,
    imageUrl: p.thumbnail,
    images: [p.thumbnail],
    stock: 20,
    inStock: true,
    rating: 4.5,
    reviewCount: 150,
    tags: ['new', p.category],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  };
});

const defaultCart = {
  id: 'cart-123',
  items: [
    {
      id: 'cart-item-1',
      productId: products[0].id,
      title: products[0].title,
      qty: 1,
      unitPrice: products[0].price,
      imageUrl: products[0].imageUrl,
      maxQuantity: 20,
    },
    {
      id: 'cart-item-2',
      productId: products[1].id,
      title: products[1].title,
      qty: 1,
      unitPrice: products[1].price,
      imageUrl: products[1].imageUrl,
      maxQuantity: 20,
    },
  ],
  itemCount: 2,
};

const addresses = [
  {
    id: 'address-1',
    receiverName: 'John Jakarta',
    phone: '08123456789',
    addressLine1: 'Jl. Sudirman No. 12',
    addressLine2: 'Lt. 4',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '10110',
    country: 'Indonesia',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'address-2',
    receiverName: 'Jane Bandung',
    phone: '08765432109',
    addressLine1: 'Jl. Dago No. 45',
    addressLine2: '',
    city: 'Bandung',
    province: 'Jawa Barat',
    postalCode: '40115',
    country: 'Indonesia',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const shippingRates = [
  {
    service: 'REG',
    description: 'Regular Service',
    cost: 15000,
    etd: '2-3 days',
    note: '',
  },
  {
    service: 'YES',
    description: 'Yakin Esok Sampai',
    cost: 35000,
    etd: '1 day',
    note: '',
  },
];

// Payment progress is per browser session, not per server process. A single
// process-wide flag made parallel Playwright workers fight over one value: one
// spec's checkout POST reset the flag while another polled for PAID.
const MOCK_SESSION_COOKIE = 'mockSessionId';
const paidOrdersBySession = new Map<string, Set<string>>();

function paidOrders(sessionId: string) {
  let orders = paidOrdersBySession.get(sessionId);
  if (!orders) {
    orders = new Set<string>();
    paidOrdersBySession.set(sessionId, orders);
  }
  return orders;
}

function handleRoute(
  path: string,
  method: string,
  body: any,
  sessionId: string,
  searchParams?: URLSearchParams,
) {
  if (path.startsWith('payments/') && path.endsWith('/status') && method === 'GET') {
    const orderId = decodeURIComponent(path.slice('payments/'.length, -'/status'.length));
    return {
      data: {
        status: paidOrders(sessionId).has(orderId) ? 'PAID' : 'PENDING',
      },
    };
  }

  if (path === 'products' && method === 'GET') {
    // Handle query parameters from searchParams
    const queryParams = new URLSearchParams(searchParams?.toString() || '');
    const q = queryParams.get('q');
    const category = queryParams.get('category');
    const brand = queryParams.get('brand');
    const minPrice = queryParams.get('minPrice');
    const maxPrice = queryParams.get('maxPrice');
    const inStock = queryParams.get('inStock');
    const sort = queryParams.get('sort');
    const page = parseInt(queryParams.get('page') || '1', 10);
    const perPage = parseInt(queryParams.get('limit') || '20', 10);

    let filteredProducts = [...products];

    // Apply filters
    if (q) {
      const query = q.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.categoryName.toLowerCase().includes(query) ||
          p.brandName.toLowerCase().includes(query),
      );
    }
    if (category) {
      filteredProducts = filteredProducts.filter(
        (p) => p.categoryId === category || p.categoryName.toLowerCase() === category.toLowerCase(),
      );
    }
    if (brand) {
      filteredProducts = filteredProducts.filter(
        (p) => p.brandId === brand || p.brandName.toLowerCase() === brand.toLowerCase(),
      );
    }
    if (minPrice) {
      filteredProducts = filteredProducts.filter((p) => p.price >= parseInt(minPrice, 10));
    }
    if (maxPrice) {
      filteredProducts = filteredProducts.filter((p) => p.price <= parseInt(maxPrice, 10));
    }
    if (inStock === 'true') {
      filteredProducts = filteredProducts.filter((p) => p.inStock && p.stock > 0);
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case 'price:asc':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price:desc':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'name:asc':
          filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'name:desc':
          filteredProducts.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }
    }

    // Apply pagination
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    return {
      data: paginatedProducts,
      pagination: { page, perPage, totalItems: filteredProducts.length },
    };
  }

  if (path.startsWith('products/') && path.endsWith('/reviews/stats') && method === 'GET') {
    return {
      average_rating: 0,
      total_reviews: 0,
      count_1_star: 0,
      count_2_star: 0,
      count_3_star: 0,
      count_4_star: 0,
      count_5_star: 0,
    };
  }

  if (path.startsWith('products/') && path.endsWith('/reviews') && method === 'GET') {
    return [];
  }

  if (path.startsWith('products/') && path.endsWith('/related') && method === 'GET') {
    const slug = path.split('/')[1];
    return { data: products.filter((product) => product.slug !== slug).slice(0, 4) };
  }

  // Q&A endpoints
  if (path.match(/^products\/[^\/]+\/questions$/) && method === 'GET') {
    const productId = path.split('/')[1];
    const page = parseInt(searchParams?.get('page') || '1', 10);
    const limit = parseInt(searchParams?.get('limit') || '10', 10);
    const sort = searchParams?.get('sort') || 'recent';

    // Generate mock questions for this product
    const questionCount = 5;
    const questions = Array.from({ length: questionCount }).map((_, i) => ({
      id: `question-${productId}-${i}`,
      product_id: productId,
      user_id: `user-${i}`,
      question: `Pertanyaan ${i + 1} untuk produk ${productId}`,
      answer: i < 3 ? `Jawaban untuk pertanyaan ${i + 1}` : null,
      answered_by: i < 3 ? 'Admin' : null,
      answered_at: i < 3 ? new Date(Date.now() - i * 86400000).toISOString() : null,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
      tenant_id: 'tenant-mock',
    }));

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = questions.slice(start, end);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total: questions.length,
        total_pages: Math.ceil(questions.length / limit),
      },
    };
  }

  if (path.match(/^questions\/[^\/]+$/) && method === 'GET') {
    const questionId = path.split('/')[1];
    return {
      id: questionId,
      product_id: 'mock-product',
      user_id: 'user-1',
      question: 'Pertanyaan contoh',
      answer: 'Jawaban contoh',
      answered_by: 'Admin',
      answered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tenant_id: 'tenant-mock',
    };
  }

  if (path.match(/^products\/[^\/]+\/questions$/) && method === 'POST') {
    const productId = path.split('/')[1];
    return {
      id: `question-new-${Date.now()}`,
      product_id: productId,
      user_id: 'current-user',
      question: body?.question || '',
      answer: null,
      answered_by: null,
      answered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tenant_id: 'tenant-mock',
    };
  }

  if (path.match(/^questions\/[^\/]+\/answer$/) && method === 'POST') {
    const questionId = path.split('/')[1];
    return {
      id: questionId,
      product_id: 'mock-product',
      user_id: 'user-1',
      question: 'Pertanyaan contoh',
      answer: body?.answer || '',
      answered_by: 'Admin',
      answered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tenant_id: 'tenant-mock',
    };
  }

  if (path.match(/^questions\/[^\/]+\/vote$/) && method === 'POST') {
    const questionId = path.split('/')[1];
    const dir = body?.dir;
    return {
      helpfulCount: dir === 'up' ? 1 : 0,
      myVote: dir === 'up' ? 'up' : null,
    };
  }

  if (path.startsWith('products/') && method === 'GET') {
    const slug = path.split('/')[1];
    const product = products.find((p) => p.slug === slug);
    if (!product) return { status: 404, message: 'Product not found' };
    return { data: product };
  }

  if ((path === 'addresses' || path === 'users/me/addresses') && method === 'GET') {
    return { data: addresses };
  }

  if (path === 'users/me/addresses' && method === 'POST') {
    const newAddress = {
      id: `address-${Date.now()}`,
      receiverName: body?.receiverName || 'New Receiver',
      phone: body?.phone || '08123456789',
      addressLine1: body?.addressLine1 || 'Jl. New Address',
      addressLine2: body?.addressLine2 || '',
      city: body?.city || 'Jakarta',
      province: body?.province || 'DKI Jakarta',
      postalCode: body?.postalCode || '12345',
      country: body?.country || 'Indonesia',
      isDefault: body?.isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { data: newAddress };
  }

  if (path.startsWith('users/me/addresses/') && method === 'PATCH') {
    const id = path.split('/').pop();
    return {
      data: {
        id,
        receiverName: body?.receiverName || 'Updated Receiver',
        phone: body?.phone || '08123456789',
        addressLine1: body?.addressLine1 || 'Jl. Updated',
        addressLine2: body?.addressLine2 || '',
        city: body?.city || 'Jakarta',
        province: body?.province || 'DKI Jakarta',
        postalCode: body?.postalCode || '12345',
        country: body?.country || 'Indonesia',
        isDefault: body?.isDefault || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  if (path.startsWith('users/me/addresses/') && method === 'DELETE') {
    return { status: 204 };
  }

  if ((path === 'carts' || path === 'cart' || path.startsWith('carts/')) && method === 'GET') {
    const totalAmount = defaultCart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const totalQty = defaultCart.items.reduce((sum, item) => sum + item.qty, 0);
    return {
      data: {
        id: defaultCart.id,
        anonId: null,
        voucher: null,
        currency: 'IDR',
        pricing: {
          subtotal: totalAmount,
          discount: 0,
          tax: 0,
          shipping: 0,
          total: totalAmount,
        },
        items: defaultCart.items,
        itemCount: totalQty,
      },
    };
  }

  // Cart promo endpoints: /carts/{cartId}/apply-voucher (POST) and /carts/{cartId}/voucher (DELETE)
  if (path.includes('/apply-voucher') && method === 'POST') {
    const code = (body?.code || '').trim().toUpperCase();
    const promoData: Record<string, object> = {
      SAVE10: {
        valid: true,
        promo: {
          code: 'SAVE10',
          discountType: 'percent',
          value: 10,
          label: 'Diskon 10% untuk pesananmu',
        },
        message: 'Diskon 10% berhasil diterapkan',
      },
      SHIPFREE: {
        valid: true,
        promo: {
          code: 'SHIPFREE',
          discountType: 'amount',
          value: 15000,
          label: 'Gratis ongkir hingga Rp15.000',
        },
        message: 'Gratis ongkir aktif',
      },
    };
    const found = promoData[code];
    if (!found) {
      return { valid: false, message: 'Kode promo tidak ditemukan' };
    }
    // Return without data wrapper
    return found;
  }

  if (path.includes('/voucher') && method === 'DELETE') {
    return { valid: false, promo: null };
  }

  if (path.includes('quote/shipping') && method === 'POST') {
    return { data: shippingRates };
  }

  if (path === 'checkout' && method === 'POST') {
    // A fresh order starts unpaid again.
    paidOrders(sessionId).delete('order-success-id');
    return {
      data: {
        orderId: 'order-success-id',
        orderNumber: 'ORD-SUCCESS-NUM',
        status: 'pending_payment',
        total: defaultCart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
        currency: 'IDR',
        paymentMethod: body?.paymentMethod || 'bank_transfer',
      },
    };
  }

  if (path === 'checkout/draft' && method === 'POST') {
    return {
      data: {
        id: 'draft-123',
        status: 'draft',
      },
    };
  }

  if (path === 'payments/intent' && method === 'POST') {
    // "Bayar Sekarang" settles immediately in the mock.
    paidOrders(sessionId).add(String(body?.orderId ?? 'order-success-id'));
    return {
      data: {
        provider: body?.provider || 'midtrans',
        token: 'mock-token-12345',
        redirectUrl: 'https://payment.example.com/pay',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    };
  }

  // Promo/Voucher endpoints
  if ((path === 'vouchers/validate' || path === 'vouchers/apply') && method === 'POST') {
    const code = (body?.code || '').trim().toUpperCase();
    const promoCatalog: Record<string, object> = {
      SAVE10: {
        valid: true,
        code: 'SAVE10',
        discountType: 'percent',
        value: 10,
        label: 'Diskon 10% untuk pesananmu',
        message: 'Diskon 10% berhasil diterapkan',
      },
      SHIPFREE: {
        valid: true,
        code: 'SHIPFREE',
        discountType: 'amount',
        value: 15000,
        label: 'Gratis ongkir hingga Rp15.000',
        message: 'Gratis ongkir aktif',
      },
    };
    const promo = promoCatalog[code];
    if (!promo) {
      return { status: 400, valid: false, message: 'Kode promo tidak ditemukan' };
    }
    return { data: promo };
  }

  if (path === 'orders' && method === 'GET') {
    // Handle query parameters from searchParams
    const queryParams = new URLSearchParams(searchParams?.toString() || '');
    const status = queryParams.get('status');
    const page = parseInt(queryParams.get('page') || '1', 10);
    const limit = parseInt(queryParams.get('limit') || '20', 10);

    const ordersList = [
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'pending_payment',
        total: 100000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-002',
        status: 'paid',
        total: 200000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-3',
        orderNumber: 'ORD-003',
        status: 'packed',
        total: 300000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-4',
        orderNumber: 'ORD-004',
        status: 'shipped',
        total: 400000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-5',
        orderNumber: 'ORD-005',
        status: 'delivered',
        total: 500000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-6',
        orderNumber: 'ORD-006',
        status: 'cancelled',
        total: 150000,
        currency: 'IDR',
        itemCount: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    // Apply status filter if provided
    let filteredOrders = ordersList;
    if (status) {
      filteredOrders = ordersList.filter((o) => o.status === status);
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedOrders = filteredOrders.slice(start, end);

    return {
      data: paginatedOrders,
      meta: {
        page,
        limit,
        total: filteredOrders.length,
        totalPages: Math.ceil(filteredOrders.length / limit),
      },
    };
  }

  if (path.startsWith('orders/') && method === 'GET') {
    const orderId = path.split('/')[1];

    // Extract status from orderId if it's formatted as order-status-X
    let status = 'paid';
    if (orderId.startsWith('order-status-')) {
      status = orderId.replace('order-status-', '');
    } else if (orderId === 'order-expired-payment') {
      status = 'pending_payment';
    } else if (orderId === 'order-shop-test') {
      status = 'paid';
    } else if (orderId.includes('pending')) {
      status = 'pending_payment';
    }

    const payment =
      status === 'pending_payment'
        ? {
            method: 'bank_transfer',
            status: 'pending',
            paymentUrl: 'https://payment.example.com/pay',
            paymentExpiry:
              orderId === 'order-expired-payment'
                ? new Date(Date.now() - 3600000).toISOString() // Expired 1 hour ago
                : new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
          }
        : null;

    const orderDetail = {
      id: orderId,
      orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      status,
      total: 100000,
      currency: 'IDR',
      itemCount: 1,
      createdAt: new Date().toISOString(),
      pricing: {
        subtotal: 100000,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: 100000,
      },
      payment,
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
      },
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          productTitle: 'Mock Product',
          productSlug: 'mock-product',
          qty: 1,
          unitPrice: 100000,
          subtotal: 100000,
        },
      ],
      shippingAddress: {
        receiverName: 'John Doe',
        phone: '08123456789',
        addressLine1: 'Jl. Mock No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'Indonesia',
      },
    };

    return { data: orderDetail };
  }

  if (
    (path === 'carts' || path === 'cart' || path.startsWith('carts/')) &&
    (method === 'POST' || method === 'PATCH' || method === 'DELETE')
  ) {
    // For PATCH on cart items, return updated quantity from request body
    let items = defaultCart.items;
    if (method === 'PATCH' && path.includes('/items/')) {
      const itemId = path.split('/items/')[1];
      const qty: number = body?.qty ?? body?.quantity ?? 1;
      items = defaultCart.items.map((item) => (item.id === itemId ? { ...item, qty } : item));
    }
    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    return {
      data: {
        id: defaultCart.id,
        anonId: null,
        voucher: null,
        currency: 'IDR',
        pricing: {
          subtotal: totalAmount,
          discount: 0,
          tax: 0,
          shipping: 0,
          total: totalAmount,
        },
        items,
        itemCount: totalQty,
      },
    };
  }

  if (path === 'auth/register' && method === 'POST') {
    return {
      data: {
        user: {
          id: 'user-123',
          name: body?.name || 'John Doe',
          email: body?.email || 'john.doe@example.com',
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
        accessToken: 'mock-access-token-12345',
      },
    };
  }

  if (path === 'auth/login' && method === 'POST') {
    if (body?.email === 'wrong@example.com' || body?.password === 'wrongpassword') {
      return {
        status: 400,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau password salah',
        },
      };
    }
    return {
      data: {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: body?.email || 'john.doe@example.com',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
        accessToken: 'mock-access-token-12345',
      },
    };
  }

  if (path === 'auth/logout' && method === 'POST') {
    return { data: { message: 'Logged out successfully' } };
  }

  if (path === 'auth/me' && method === 'GET') {
    return {
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (path === 'users/me' && method === 'PATCH') {
    return {
      data: {
        id: 'user-123',
        name: body?.name || 'John Doe',
        email: 'john.doe@example.com',
        phone: body?.phone,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (path === 'auth/password/forgot' && method === 'POST') {
    return { data: { message: 'Password reset email sent' } };
  }

  if (path === 'auth/password/reset' && method === 'POST') {
    return { data: { message: 'Password reset successfully' } };
  }

  if (path === 'auth/email/verify' && method === 'POST') {
    return { data: { message: 'Email verified successfully' } };
  }

  if (path === 'auth/email/resend' && method === 'POST') {
    return { data: { message: 'Verification email sent' } };
  }

  if (path === 'auth/sessions' && method === 'GET') {
    return {
      data: [
        {
          id: 'session-1',
          device: 'Chrome',
          ipAddress: '127.0.0.1',
          location: 'Jakarta, ID',
          lastActive: new Date().toISOString(),
          current: true,
        },
      ],
    };
  }

  if (path === 'auth/logout/all' && method === 'POST') {
    return { data: { message: 'Semua sesi telah keluar.' } };
  }

  if (path === 'auth/refresh' && method === 'POST') {
    return { data: { accessToken: 'mock-access-token' } };
  }

  if (path === 'auth/session' && method === 'GET') {
    return { data: { user: { id: 'user-123', name: 'John Doe', email: 'john.doe@example.com' } } };
  }

  return null;
}

function jsonResponse(result: any, sessionId: string, isNewSession: boolean) {
  const response = buildResponse(result);
  if (isNewSession) {
    response.cookies.set(MOCK_SESSION_COOKIE, sessionId, { path: '/', httpOnly: false });
  }
  return response;
}

function buildResponse(result: any) {
  if (!result) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }
  if (typeof result === 'object' && 'status' in result && typeof result.status === 'number') {
    const { status, ...rest } = result;
    return NextResponse.json(rest, { status });
  }
  return NextResponse.json(result);
}

function resolveSession(req: NextRequest) {
  const existing = req.cookies.get(MOCK_SESSION_COOKIE)?.value;
  if (existing) {
    return { sessionId: existing, isNewSession: false };
  }
  return { sessionId: crypto.randomUUID(), isNewSession: true };
}

async function readJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function handle(
  req: NextRequest,
  params: Promise<{ path?: string[] }>,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
) {
  const paramsData = await params;
  const path = paramsData.path?.join('/') || '';
  const { sessionId, isNewSession } = resolveSession(req);
  const body = method === 'POST' || method === 'PATCH' ? await readJsonBody(req) : null;
  const result = handleRoute(path, method, body, sessionId, req.nextUrl.searchParams);
  return jsonResponse(result, sessionId, isNewSession);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, params, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, params, 'POST');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return handle(req, params, 'PATCH');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return handle(req, params, 'DELETE');
}
