/**
 * `GET admin/reports/*`: the admin reports computed from the per-session admin
 * store, following the backend contract (docs/contracts/analytics.md in
 * toko-api): the revenue rule, `[from, to)` ranges with bare dates at tenant
 * midnight, 4-decimal rates, and `format=csv` attachments with a UTF-8 BOM,
 * RFC 4180 quoting and formula-injection-safe text cells.
 *
 * Mock simplifications: the tenant timezone is fixed to Asia/Jakarta (UTC+7,
 * no DST); fixture orders carry no refunds, so refunded amounts are 0; carts
 * are not recorded, so `cartsCreated` assumes 1.5 abandoned carts per checkout.
 */
import { categories } from '../fixtures';

import type { AdminStore } from './session';
import type { MockFile, MockResult } from './types';

import type { AdminOrderDetail, AdminOrderStatus } from '@/entities/admin/types';

export const MOCK_REPORT_TIMEZONE = 'Asia/Jakarta';
const OFFSET_MS = 7 * 3_600_000;
const OFFSET = '+07:00';
const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;
const CSV_MAX_ROWS = 100_000;

/** Statuses whose orders count as revenue (when not fully refunded). */
export const REVENUE_STATUSES: ReadonlySet<AdminOrderStatus> = new Set<AdminOrderStatus>([
  'PAID',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]);

/** Fixture orders have no refunds, so every revenue-status order counts in full. */
export function isRevenueOrder(order: AdminOrderDetail): boolean {
  return REVENUE_STATUSES.has(order.status);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(message: string): MockResult {
  return { status: 400, error: { code: 'BAD_REQUEST', message } };
}

/** RFC3339 as-is; YYYY-MM-DD is midnight in the tenant timezone. */
function parseTime(raw: string): number | null {
  const value = raw.trim();
  let time = NaN;
  if (RFC3339_RE.test(value)) time = Date.parse(value);
  else if (DATE_RE.test(value)) {
    time = Date.parse(`${value}T00:00:00${OFFSET}`);
    if (new Date(time + OFFSET_MS).toISOString().slice(0, 10) !== value) time = NaN;
  }
  return Number.isNaN(time) ? null : time;
}

/** Tenant-local `YYYY-MM-DD` of an instant. */
function localDay(time: number): string {
  return new Date(time + OFFSET_MS).toISOString().slice(0, 10);
}

/** RFC3339 with the tenant offset, e.g. `2026-10-01T00:00:00+07:00`. */
function localTimestamp(time: number): string {
  return `${new Date(time + OFFSET_MS).toISOString().slice(0, 19)}${OFFSET}`;
}

type Scope = { from: number; to: number; csv: boolean };

function resolveScope(params: URLSearchParams, now: number): Scope | { error: MockResult } {
  const format = (params.get('format') ?? '').trim().toLowerCase();
  if (format !== '' && format !== 'json' && format !== 'csv') {
    return { error: badRequest('format must be json or csv') };
  }
  const rawFrom = params.get('from')?.trim() ?? '';
  const rawTo = params.get('to')?.trim() ?? '';
  const from = rawFrom ? parseTime(rawFrom) : null;
  const to = rawTo ? parseTime(rawTo) : null;
  if (rawFrom && from === null)
    return { error: badRequest('invalid from: use RFC3339 or YYYY-MM-DD') };
  if (rawTo && to === null) return { error: badRequest('invalid to: use RFC3339 or YYYY-MM-DD') };
  const end = to ?? Date.parse(`${localDay(now + DAY_MS)}T00:00:00${OFFSET}`);
  const start = from ?? end - DEFAULT_DAYS * DAY_MS;
  if (start >= end) return { error: badRequest('from must be before to') };
  if (end - start > MAX_DAYS * DAY_MS)
    return { error: badRequest('range must not exceed 366 days') };
  return { from: start, to: end, csv: format === 'csv' };
}

function inRange(order: AdminOrderDetail, scope: Scope): boolean {
  const created = Date.parse(order.createdAt);
  return created >= scope.from && created < scope.to;
}

function ratio(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 10_000) / 10_000;
}

function rangeDto(scope: Scope) {
  return {
    from: localTimestamp(scope.from),
    to: localTimestamp(scope.to),
    timezone: MOCK_REPORT_TIMEZONE,
  };
}

// --- CSV --------------------------------------------------------------------

/** Text cells starting with = + - @ TAB or CR get a leading quote (formula injection). */
export function csvText(value: string | null | undefined): string {
  const text = value ?? '';
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** RFC 4180 field quoting, matching Go's encoding/csv. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) || value.startsWith(' ') ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvFile(report: string, scope: Scope, header: string[], rows: string[][]): MockResult {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(','));
  const file: MockFile = {
    body: `﻿${lines.join('\n')}\n`,
    contentType: 'text/csv; charset=utf-8',
    filename: `${report}_${localDay(scope.from)}_${localDay(scope.to)}.csv`,
  };
  return { file };
}

// --- Item-level aggregation ---------------------------------------------------

type Totals = { unitsSold: number; orders: Set<string>; revenue: number };

function categoryOf(admin: AdminStore, productId: string | null) {
  const product = productId ? admin.products.find((p) => p.id === productId) : undefined;
  const category = product?.categoryId
    ? categories.find((c) => c.id === product.categoryId)
    : undefined;
  return category
    ? { categoryId: category.id, categoryName: category.name, categorySlug: category.slug }
    : { categoryId: null, categoryName: 'Uncategorized', categorySlug: null };
}

function revenueItems(admin: AdminStore, scope: Scope) {
  return admin.orders
    .filter((order) => isRevenueOrder(order) && inRange(order, scope))
    .flatMap((order) =>
      order.items.map((item) => ({
        orderId: order.id,
        item,
        ...categoryOf(admin, item.productId ?? null),
      })),
    );
}

function add(totals: Totals, orderId: string, qty: number, subtotal: number) {
  totals.unitsSold += qty;
  totals.orders.add(orderId);
  totals.revenue += subtotal;
}

function salesByCategory(admin: AdminStore, scope: Scope) {
  const groups = new Map<
    string,
    Totals & { categoryId: string | null; categoryName: string; categorySlug: string | null }
  >();
  for (const entry of revenueItems(admin, scope)) {
    const key = entry.categoryId ?? '';
    const group = groups.get(key) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      categorySlug: entry.categorySlug,
      unitsSold: 0,
      orders: new Set<string>(),
      revenue: 0,
    };
    add(group, entry.orderId, entry.item.qty, entry.item.subtotal);
    groups.set(key, group);
  }
  const totalRevenue = [...groups.values()].reduce((sum, g) => sum + g.revenue, 0);
  const totalUnits = [...groups.values()].reduce((sum, g) => sum + g.unitsSold, 0);
  const rows = [...groups.values()]
    .map((g) => ({
      categoryId: g.categoryId,
      categoryName: g.categoryName,
      categorySlug: g.categorySlug,
      unitsSold: g.unitsSold,
      orders: g.orders.size,
      revenue: g.revenue,
      share: ratio(g.revenue, totalRevenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || a.categoryName.localeCompare(b.categoryName));
  return { ...rangeDto(scope), totalRevenue, totalUnits, rows };
}

function salesByProduct(admin: AdminStore, scope: Scope, categoryId: string | null) {
  const groups = new Map<
    string,
    Totals & {
      productId: string | null;
      title: string;
      slug: string;
      categoryId: string | null;
      categoryName: string;
    }
  >();
  for (const entry of revenueItems(admin, scope)) {
    if (categoryId && entry.categoryId !== categoryId) continue;
    const key = entry.item.productId ?? `slug:${entry.item.slug}`;
    const group = groups.get(key) ?? {
      productId: entry.item.productId ?? null,
      title: entry.item.title,
      slug: entry.item.slug,
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      unitsSold: 0,
      orders: new Set<string>(),
      revenue: 0,
    };
    add(group, entry.orderId, entry.item.qty, entry.item.subtotal);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ orders, ...row }) => ({ ...row, orders: orders.size }))
    .sort((a, b) => b.revenue - a.revenue || a.title.localeCompare(b.title));
}

function conversion(admin: AdminStore, scope: Scope) {
  const orders = admin.orders.filter((order) => inRange(order, scope));
  const paid = orders.filter(isRevenueOrder);
  const checkoutsStarted = orders.length;
  const cartsCreated = Math.round(checkoutsStarted * 2.5);
  const paidOrders = paid.length;
  return {
    ...rangeDto(scope),
    cartsCreated,
    checkoutsStarted,
    paidOrders,
    pendingOrders: orders.filter((o) => o.status === 'PENDING_PAYMENT').length,
    cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
    refundedOrders: 0,
    paidRevenue: paid.reduce((sum, o) => sum + o.total, 0),
    refundedAmount: 0,
    checkoutRate: ratio(checkoutsStarted, cartsCreated),
    paymentRate: ratio(paidOrders, checkoutsStarted),
    conversionRate: ratio(paidOrders, cartsCreated),
  };
}

function customers(admin: AdminStore, scope: Scope) {
  const revenueOrders = admin.orders.filter(isRevenueOrder);
  const firstOrderAt = new Map<string, number>();
  for (const order of revenueOrders) {
    if (!order.userId) continue;
    const created = Date.parse(order.createdAt);
    const first = firstOrderAt.get(order.userId);
    if (first === undefined || created < first) firstOrderAt.set(order.userId, created);
  }

  const inScope = revenueOrders.filter((order) => inRange(order, scope));
  const isNew = (userId: string) => (firstOrderAt.get(userId) ?? 0) >= scope.from;
  const summary = {
    newUsers: new Set<string>(),
    returningUsers: new Set<string>(),
    ordersFromNew: 0,
    ordersFromReturning: 0,
    revenueFromNew: 0,
    revenueFromReturning: 0,
    guestOrders: 0,
    guestRevenue: 0,
  };
  const days = new Map<
    string,
    { newUsers: Set<string>; returningUsers: Set<string>; orders: number; revenue: number }
  >();

  for (const order of inScope) {
    if (!order.userId) {
      summary.guestOrders += 1;
      summary.guestRevenue += order.total;
      continue;
    }
    if (isNew(order.userId)) {
      summary.newUsers.add(order.userId);
      summary.ordersFromNew += 1;
      summary.revenueFromNew += order.total;
    } else {
      summary.returningUsers.add(order.userId);
      summary.ordersFromReturning += 1;
      summary.revenueFromReturning += order.total;
    }
    const created = Date.parse(order.createdAt);
    const day = localDay(created);
    const bucket = days.get(day) ?? {
      newUsers: new Set<string>(),
      returningUsers: new Set<string>(),
      orders: 0,
      revenue: 0,
    };
    // New on this day: the user's first revenue order falls on this local day.
    if (localDay(firstOrderAt.get(order.userId) ?? created) === day)
      bucket.newUsers.add(order.userId);
    else bucket.returningUsers.add(order.userId);
    bucket.orders += 1;
    bucket.revenue += order.total;
    days.set(day, bucket);
  }

  const totalCustomers = summary.newUsers.size + summary.returningUsers.size;
  return {
    ...rangeDto(scope),
    newCustomers: summary.newUsers.size,
    returningCustomers: summary.returningUsers.size,
    totalCustomers,
    repeatRate: ratio(summary.returningUsers.size, totalCustomers),
    ordersFromNew: summary.ordersFromNew,
    ordersFromReturning: summary.ordersFromReturning,
    revenueFromNew: summary.revenueFromNew,
    revenueFromReturning: summary.revenueFromReturning,
    guestOrders: summary.guestOrders,
    guestRevenue: summary.guestRevenue,
    daily: [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, bucket]) => ({
        day,
        newCustomers: bucket.newUsers.size,
        returningCustomers: bucket.returningUsers.size,
        orders: bucket.orders,
        revenue: bucket.revenue,
      })),
  };
}

function positiveInt(raw: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const value = parseInt(raw ?? '', 10);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(value, max);
}

/**
 * Resolves `admin/reports/<report>`; `parts` is the path below `admin/`.
 * Returns undefined for anything that is not a known report GET.
 */
export function resolveReports(
  admin: AdminStore,
  method: string,
  parts: string[],
  params: URLSearchParams,
  now: number = Date.now(),
): MockResult | undefined {
  if (parts[0] !== 'reports' || parts.length !== 2 || method !== 'GET') return undefined;
  const report = parts[1];
  if (!['sales-by-category', 'sales-by-product', 'conversion', 'customers'].includes(report)) {
    return undefined;
  }
  const resolved = resolveScope(params, now);
  if ('error' in resolved) return resolved.error;
  const scope = resolved;

  if (report === 'sales-by-category') {
    const data = salesByCategory(admin, scope);
    if (!scope.csv) return { data };
    return csvFile(
      report,
      scope,
      ['category_id', 'category', 'category_slug', 'units_sold', 'orders', 'revenue', 'share'],
      data.rows.map((row) => [
        row.categoryId ?? '',
        csvText(row.categoryName),
        csvText(row.categorySlug),
        String(row.unitsSold),
        String(row.orders),
        String(row.revenue),
        String(row.share),
      ]),
    );
  }

  if (report === 'sales-by-product') {
    const categoryId = params.get('categoryId')?.trim() || null;
    if (categoryId && !UUID_RE.test(categoryId) && !categories.some((c) => c.id === categoryId)) {
      return badRequest('invalid categoryId');
    }
    const rows = salesByProduct(admin, scope, categoryId);
    if (scope.csv) {
      return csvFile(
        report,
        scope,
        [
          'product_id',
          'title',
          'slug',
          'category_id',
          'category',
          'units_sold',
          'orders',
          'revenue',
        ],
        rows
          .slice(0, CSV_MAX_ROWS)
          .map((row) => [
            row.productId ?? '',
            csvText(row.title),
            csvText(row.slug),
            row.categoryId ?? '',
            csvText(row.categoryName),
            String(row.unitsSold),
            String(row.orders),
            String(row.revenue),
          ]),
      );
    }
    const page = positiveInt(params.get('page'), 1);
    const perPage = positiveInt(params.get('limit'), 20, 100);
    const start = (page - 1) * perPage;
    return {
      data: rows.slice(start, start + perPage),
      pagination: { page, perPage, totalItems: rows.length },
      range: rangeDto(scope),
    };
  }

  if (report === 'conversion') {
    const data = conversion(admin, scope);
    if (!scope.csv) return { data };
    return csvFile(
      report,
      scope,
      [
        'from',
        'to',
        'timezone',
        'carts_created',
        'checkouts_started',
        'paid_orders',
        'pending_orders',
        'cancelled_orders',
        'refunded_orders',
        'paid_revenue',
        'refunded_amount',
        'checkout_rate',
        'payment_rate',
        'conversion_rate',
      ],
      [
        [
          data.from,
          data.to,
          data.timezone,
          ...[
            data.cartsCreated,
            data.checkoutsStarted,
            data.paidOrders,
            data.pendingOrders,
            data.cancelledOrders,
            data.refundedOrders,
            data.paidRevenue,
            data.refundedAmount,
            data.checkoutRate,
            data.paymentRate,
            data.conversionRate,
          ].map(String),
        ],
      ],
    );
  }

  const data = customers(admin, scope);
  if (!scope.csv) return { data };
  return csvFile(
    report,
    scope,
    ['day', 'new_customers', 'returning_customers', 'orders', 'revenue'],
    data.daily.map((row) => [
      row.day,
      String(row.newCustomers),
      String(row.returningCustomers),
      String(row.orders),
      String(row.revenue),
    ]),
  );
}
