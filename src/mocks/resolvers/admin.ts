import { ADMIN_ORDER_STATUSES, buildAdminTaxonomy, toAdminOrderRow } from '../factories/admin';
import { stableUuid } from '../factories/product';
import { adminOrders, adminProducts, brands, categories } from '../fixtures';

import { isAdminRequest } from './auth';
import { adminStore, type AdminStore } from './session';
import type { MockRequest, MockResult } from './types';

import type {
  AdminOrderStatus,
  AdminProductDetail,
  AdminProductInput,
} from '@/lib/api/services/admin';

const FORBIDDEN = { status: 403, error: { code: 'FORBIDDEN', message: 'Admin access required' } };
const NOT_FOUND = { status: 404, error: { code: 'NOT_FOUND', message: 'Not Found' } };

function store(sessionId: string): AdminStore {
  return adminStore(sessionId, () => ({ products: adminProducts, orders: adminOrders }));
}

function paginate<T>(rows: T[], searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
  const start = (page - 1) * perPage;
  return {
    data: rows.slice(start, start + perPage),
    pagination: { page, perPage, totalItems: rows.length },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findProduct(admin: AdminStore, idOrSlug: string) {
  return admin.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

/** Applies an `AdminProductInput` patch; keys absent from `input` stay unchanged. */
function applyProductInput(product: AdminProductDetail, input: AdminProductInput) {
  const now = new Date().toISOString();
  const { images, specs, variants: _variants, ...fields } = input;
  Object.assign(product, fields, { updatedAt: now });
  if (input.categoryId !== undefined) {
    product.categoryName = categories.find((c) => c.id === input.categoryId)?.name ?? null;
  }
  if (input.brandId !== undefined) {
    product.brandName = brands.find((b) => b.id === input.brandId)?.name ?? null;
  }
  if (images) {
    product.images = images.map((url, index) => ({
      id: `${product.id}-image-${index + 1}`,
      url,
      sortOrder: index,
    }));
  }
  if (specs) product.specs = specs;
  if (input.variants?.[0]?.stock !== undefined) product.stock = input.variants[0].stock;
  return product;
}

function listProducts(admin: AdminStore, searchParams: URLSearchParams) {
  const search = (searchParams.get('search') || searchParams.get('q') || '').toLowerCase();
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const inStock = searchParams.get('inStock');
  const categoryId = categories.find((c) => c.slug === category)?.id ?? category;
  const brandId = brands.find((b) => b.slug === brand)?.id ?? brand;

  const rows = admin.products
    .filter(
      (p) =>
        !search || [p.title, p.slug, p.sku ?? ''].some((f) => f.toLowerCase().includes(search)),
    )
    .filter((p) => !category || p.categoryId === categoryId)
    .filter((p) => !brand || p.brandId === brandId)
    .filter((p) => inStock === null || p.inStock === (inStock === 'true'))
    // List rows omit the detail-only collections.
    .map(({ images: _i, specs: _s, variants: _v, ...row }) => row);
  return paginate(rows, searchParams);
}

function createProduct(admin: AdminStore, input: AdminProductInput): MockResult {
  if (!input.title || input.price === undefined) {
    return {
      status: 400,
      error: { code: 'VALIDATION_ERROR', message: 'title and price are required' },
    };
  }
  admin.created += 1;
  const slug = input.slug || slugify(input.title);
  const id = stableUuid(`admin-created:${slug}:${admin.created}`);
  const now = new Date().toISOString();
  const product: AdminProductDetail = {
    id,
    title: input.title,
    slug,
    price: input.price,
    inStock: input.inStock ?? true,
    stock: input.variants?.[0]?.stock ?? 0,
    badges: [],
    variantCount: 1,
    sku: input.variants?.[0]?.sku ?? null,
    createdAt: now,
    updatedAt: now,
    images: [],
    specs: [],
    variants: [],
  };
  applyProductInput(product, input);
  product.variants = [
    {
      id: `${id}-variant-1`,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      attributes: {},
    },
  ];
  admin.products.unshift(product);
  return { status: 201, data: { id, slug } };
}

function resolveProducts(
  admin: AdminStore,
  req: MockRequest,
  parts: string[],
): MockResult | undefined {
  const { method, body, searchParams } = req;
  if (parts.length === 1) {
    if (method === 'GET') return listProducts(admin, searchParams);
    if (method === 'POST') return createProduct(admin, body ?? {});
    return undefined;
  }

  const product = findProduct(admin, parts[1]);
  if (!product) return NOT_FOUND;

  if (parts.length === 2) {
    if (method === 'GET') return { data: product };
    if (method === 'PATCH' || method === 'PUT')
      return { data: applyProductInput(product, body ?? {}) };
    if (method === 'DELETE') {
      admin.products = admin.products.filter((p) => p !== product);
      return { data: { id: product.id } };
    }
  }

  if (parts.length === 3 && parts[2] === 'stock' && method === 'PATCH') {
    if (typeof body?.stock === 'number') {
      product.stock = body.stock;
      product.inStock = body.stock > 0;
    }
    if (typeof body?.inStock === 'boolean') product.inStock = body.inStock;
    product.updatedAt = new Date().toISOString();
    return { data: { id: product.id, inStock: product.inStock, stock: product.stock } };
  }
  return undefined;
}

function orderStats(admin: AdminStore) {
  const count = (status: AdminOrderStatus) =>
    admin.orders.filter((o) => o.status === status).length;
  const billable = admin.orders.filter((o) => o.status !== 'CANCELLED');
  const totalRevenue = billable.reduce((sum, o) => sum + o.total, 0);
  return {
    totalOrders: admin.orders.length,
    totalRevenue,
    pendingOrders: count('PENDING_PAYMENT'),
    paidOrders: count('PAID'),
    shippedOrders: count('SHIPPED'),
    deliveredOrders: count('DELIVERED'),
    cancelledOrders: count('CANCELLED'),
    averageOrderValue: billable.length ? Math.round(totalRevenue / billable.length) : 0,
  };
}

function resolveOrders(
  admin: AdminStore,
  req: MockRequest,
  parts: string[],
): MockResult | undefined {
  const { method, body, searchParams } = req;
  if (parts.length === 1 && method === 'GET') {
    const status = searchParams.get('status');
    const search = (searchParams.get('search') || '').toLowerCase();
    const rows = admin.orders
      .filter((o) => !status || status === 'all' || o.status === status)
      .filter(
        (o) =>
          !search ||
          [o.orderNumber, o.customerName, o.customerEmail].some((f) =>
            f?.toLowerCase().includes(search),
          ),
      )
      .map(toAdminOrderRow);
    return paginate(rows, searchParams);
  }
  if (parts.length === 2 && parts[1] === 'stats' && method === 'GET') {
    return { data: orderStats(admin) };
  }

  const order = admin.orders.find((o) => o.id === parts[1]);
  if (!order) return NOT_FOUND;
  if (parts.length === 2 && method === 'GET') return { data: order };
  if (parts.length === 3 && parts[2] === 'status' && method === 'PATCH') {
    if (!ADMIN_ORDER_STATUSES.includes(body?.status)) {
      return { status: 400, error: { code: 'VALIDATION_ERROR', message: 'Invalid order status' } };
    }
    order.status = body.status;
    order.updatedAt = new Date().toISOString();
    return { data: toAdminOrderRow(order) };
  }
  return undefined;
}

function analyticsOverview(admin: AdminStore, range: string) {
  const stats = orderStats(admin);
  const sold = new Map<
    string,
    { productId: string; title: string; slug: string; unitsSold: number; revenue: number }
  >();
  for (const order of admin.orders.filter((o) => o.status !== 'CANCELLED')) {
    for (const item of order.items) {
      const key = item.productId ?? item.slug;
      const entry = sold.get(key) ?? {
        productId: key,
        title: item.title,
        slug: item.slug,
        unitsSold: 0,
        revenue: 0,
      };
      entry.unitsSold += item.qty;
      entry.revenue += item.subtotal;
      sold.set(key, entry);
    }
  }
  return {
    range,
    totalRevenue: stats.totalRevenue,
    totalOrders: stats.totalOrders,
    totalCustomers: new Set(admin.orders.map((o) => o.userId)).size,
    totalProducts: admin.products.length,
    averageOrderValue: stats.averageOrderValue,
    pendingOrders: stats.pendingOrders,
    paidOrders: stats.paidOrders,
    shippedOrders: stats.shippedOrders,
    deliveredOrders: stats.deliveredOrders,
    cancelledOrders: stats.cancelledOrders,
    topProducts: [...sold.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

/**
 * Admin endpoints backed by a per-session store seeded from the fixtures.
 * Every `admin/*` path needs the `MOCK_ADMIN_TOKEN` bearer token (403
 * otherwise); admin endpoints that are not implemented here return 404.
 */
export function resolveAdmin(req: MockRequest): MockResult | undefined {
  if (req.path !== 'admin' && !req.path.startsWith('admin/')) return undefined;
  if (!isAdminRequest(req.headers)) return FORBIDDEN;

  const admin = store(req.sessionId);
  const parts = req.path.split('/').slice(1);
  const countBy = (key: 'categoryId' | 'brandId', id: string) =>
    admin.products.filter((p) => p[key] === id).length;

  let result: MockResult | undefined;
  if (parts[0] === 'products') result = resolveProducts(admin, req, parts);
  else if (parts[0] === 'orders') result = resolveOrders(admin, req, parts);
  else if (parts.length === 1 && req.method === 'GET' && parts[0] === 'categories') {
    result = { data: categories.map((c) => buildAdminTaxonomy(c, countBy('categoryId', c.id))) };
  } else if (parts.length === 1 && req.method === 'GET' && parts[0] === 'brands') {
    result = { data: brands.map((b) => buildAdminTaxonomy(b, countBy('brandId', b.id))) };
  } else if (parts.join('/') === 'analytics/overview' && req.method === 'GET') {
    result = { data: analyticsOverview(admin, req.searchParams.get('range') || '30d') };
  }
  return result ?? NOT_FOUND;
}
