// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { MOCK_ADMIN_TOKEN, adminProducts } from '../fixtures';
import { PRODUCT_EXPORT_COLUMNS } from '../resolvers/admin-catalog';
import { parseCsv } from '../resolvers/catalog-csv';
import { resetMockState } from '../resolvers/session';
import { handleMockRequest } from '../route';

const ADMIN = { headers: new Headers({ authorization: `Bearer ${MOCK_ADMIN_TOKEN}` }) };

type Json = any;

function admin(method: string, path: string, body: unknown = null, query = ''): Json {
  return handleMockRequest(path, method, body, 's1', new URLSearchParams(query), ADMIN);
}

function upload(text: string, query: string, name = 'products.csv'): Json {
  return admin(
    'POST',
    'admin/products/import',
    { fields: {}, files: { file: { name, type: 'text/csv', size: text.length, text } } },
    query,
  );
}

const first = adminProducts[0];
const lowSeed = adminProducts[3];
const outSeed = adminProducts[11];

afterEach(() => resetMockState());

describe('admin catalog mock: list, status and low stock', () => {
  it('decorates products with status, stockStatus and threshold', () => {
    const detail = admin('GET', `admin/products/${lowSeed.id}`).data;
    expect(detail).toMatchObject({
      status: 'published',
      stockStatus: 'low',
      lowStockThreshold: null,
    });
    const row = admin('GET', 'admin/products', null, 'limit=50').data.find(
      (p: Json) => p.id === outSeed.id,
    );
    expect(row.stockStatus).toBe('out');
  });

  it('filters by stockStatus and status, and sorts', () => {
    const low = admin('GET', 'admin/products', null, 'stockStatus=low&limit=50').data;
    expect(low.map((p: Json) => p.id)).toEqual(
      expect.arrayContaining([adminProducts[3].id, adminProducts[7].id, adminProducts[9].id]),
    );
    expect(low.every((p: Json) => p.stockStatus === 'low')).toBe(true);

    const byPrice = admin('GET', 'admin/products', null, 'sort=price:desc&limit=50').data;
    const prices = byPrice.map((p: Json) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));

    expect(admin('GET', 'admin/products', null, 'status=draft').pagination.totalItems).toBe(0);
    expect(admin('GET', 'admin/products', null, 'sort=colour').status).toBe(400);
    expect(admin('GET', 'admin/products', null, 'stockStatus=few').status).toBe(400);
  });

  it('accepts status and lowStockThreshold on PATCH and validates them', () => {
    admin('PATCH', `admin/products/${first.id}`, { status: 'draft', lowStockThreshold: 25 });
    expect(admin('GET', `admin/products/${first.id}`).data).toMatchObject({
      status: 'draft',
      lowStockThreshold: 25,
      stockStatus: 'low',
    });
    expect(admin('PATCH', `admin/products/${first.id}`, { status: 'gone' }).status).toBe(400);
    expect(admin('PATCH', `admin/products/${first.id}`, { lowStockThreshold: -1 }).status).toBe(
      400,
    );
    admin('PATCH', `admin/products/${first.id}`, { lowStockThreshold: null });
    expect(admin('GET', `admin/products/${first.id}`).data.lowStockThreshold).toBeNull();
  });

  it('lists inventory with per-variant status and filters, honouring the store default', () => {
    const low = admin('GET', 'admin/inventory', null, 'stockStatus=low').data;
    expect(low.length).toBe(3);
    expect(low[0]).toMatchObject({ stockStatus: 'low', lowStockThreshold: 5 });
    expect(admin('GET', 'admin/inventory', null, 'lowStock=true').data).toEqual(low);
    expect(admin('GET', 'admin/inventory', null, 'stockStatus=out').data).toHaveLength(1);
    expect(admin('GET', 'admin/inventory', null, 'stockStatus=nope').status).toBe(400);

    expect(admin('GET', 'admin/settings').data).toEqual({});
    const saved = admin('PATCH', 'admin/settings', { inventory: { lowStockThreshold: 25 } });
    expect(saved.data.inventory.lowStockThreshold).toBe(25);
    const lowAfter = admin('GET', 'admin/inventory', null, 'stockStatus=low').data;
    expect(lowAfter.length).toBeGreaterThan(low.length);
    expect(lowAfter[0].lowStockThreshold).toBe(25);
    expect(admin('PATCH', 'admin/settings', { inventory: { lowStockThreshold: 1.5 } }).status).toBe(
      400,
    );
  });

  it('reports low and out-of-stock counts on the overview', () => {
    expect(admin('GET', 'admin/analytics/overview').data).toMatchObject({
      lowStockProducts: 3,
      outOfStockProducts: 1,
    });
  });
});

describe('admin catalog mock: bulk updates', () => {
  it('sets prices on the product and every variant (applyTo both)', () => {
    const res = admin('POST', 'admin/products/bulk/price', {
      items: [{ productId: first.id, price: 1234, compareAt: null, applyTo: 'both' }],
    });
    expect(res.data).toEqual({
      updated: 1,
      items: [
        {
          productId: first.id,
          slug: first.slug,
          price: 1234,
          compareAt: null,
          applyTo: 'both',
          variantsUpdated: 1,
        },
      ],
    });
    expect(admin('GET', `admin/products/${first.id}`).data.variants[0].price).toBe(1234);
  });

  it('rejects the whole request with per-item errors and changes nothing', () => {
    const res = admin('POST', 'admin/products/bulk/price', {
      items: [
        { productId: first.id, price: 5000, applyTo: 'both' },
        { productId: 'missing', price: 1, applyTo: 'both' },
        { productId: lowSeed.id, price: -1, applyTo: 'both' },
        { productId: first.id, price: 7000, applyTo: 'both' },
      ],
    });
    expect(res.status).toBe(422);
    expect(res.error.code).toBe('VALIDATION_FAILED');
    expect(res.error.details.rows.map((r: Json) => [r.index, r.code])).toEqual([
      [1, 'NOT_FOUND'],
      [2, 'NEGATIVE'],
      [3, 'DUPLICATE'],
    ]);
    expect(admin('GET', `admin/products/${first.id}`).data.price).toBe(first.price);
    expect(admin('POST', 'admin/products/bulk/price', { items: [] }).status).toBe(400);
  });

  it('adjusts stock by delta, refuses negative results and recomputes the product', () => {
    const variantId = lowSeed.variants[0].id;
    expect(
      admin('POST', 'admin/products/bulk/stock', { items: [{ variantId, delta: -10 }] }).error
        .details.rows[0].code,
    ).toBe('NEGATIVE_RESULT');
    const res = admin('POST', 'admin/products/bulk/stock', { items: [{ variantId, delta: 6 }] });
    expect(res.data.items[0]).toMatchObject({ variantId, stock: 10, inStock: null });
    expect(admin('GET', `admin/products/${lowSeed.id}`).data).toMatchObject({
      stock: 10,
      stockStatus: 'in',
    });
    const out = admin('POST', 'admin/products/bulk/stock', {
      items: [{ variantId: outSeed.variants[0].id, stock: 3 }],
    });
    expect(out.data.items[0].inStock).toBe(true);
    expect(
      admin('POST', 'admin/products/bulk/stock', { items: [{ variantId, stock: 1, delta: 1 }] })
        .error.details.rows[0].code,
    ).toBe('AMBIGUOUS');
  });

  it('changes status in bulk', () => {
    const res = admin('POST', 'admin/products/bulk/status', {
      items: [
        { productId: first.id, status: 'archived' },
        { productId: lowSeed.id, status: 'published' },
      ],
    });
    expect(res.data.updated).toBe(1);
    expect(admin('GET', 'admin/products', null, 'status=archived').data[0].id).toBe(first.id);
    expect(
      admin('POST', 'admin/products/bulk/status', {
        items: [{ productId: first.id, status: 'hidden' }],
      }).error.details.rows[0].code,
    ).toBe('INVALID_STATUS');
  });
});

describe('admin catalog mock: CSV export', () => {
  it('exports one row per variant with BOM, CRLF and the contract columns', () => {
    const res = admin('GET', 'admin/products/export', null, 'stockStatus=low');
    expect(res.file.contentType).toBe('text/csv; charset=utf-8');
    expect(res.file.filename).toMatch(/^products-\d{8}-\d{6}\.csv$/);
    expect(res.file.body.startsWith('﻿')).toBe(true);
    expect(res.file.body).toContain('\r\n');
    const [header, ...rows] = parseCsv(res.file.body);
    expect(header.cells).toEqual(PRODUCT_EXPORT_COLUMNS);
    expect(rows).toHaveLength(3);
    const stock = header.cells.indexOf('stock');
    expect(rows[0].cells[stock]).toBe(rows[0].cells[header.cells.indexOf('stock_baseline')]);
  });

  it('prefixes formula-like text but never numbers', () => {
    admin('PATCH', `admin/products/${first.id}`, { title: '=HYPERLINK("http://x","y")' });
    const body: string = admin('GET', 'admin/products/export').file.body;
    expect(body).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
    expect(body).not.toMatch(/,'\d/);
  });

  it('exports orders with filters, newest first', () => {
    const res = admin('GET', 'admin/orders/export', null, 'status=PAID');
    const [header, ...rows] = parseCsv(res.file.body);
    expect(header.cells.slice(0, 3)).toEqual(['order_number', 'order_id', 'status']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.cells[2] === 'PAID')).toBe(true);
    expect(admin('GET', 'admin/orders/export', null, 'startDate=01-01-2026').status).toBe(400);
  });
});

describe('admin catalog mock: CSV import', () => {
  const sku = first.variants[0].sku as string;

  it('re-imports an unchanged export as all unchanged', () => {
    const csv = admin('GET', 'admin/products/export').file.body;
    const res = upload(csv, 'type=products&dryRun=true');
    expect(res.data.summary).toMatchObject({ rejected: 0, update: 0, create: 0 });
    expect(res.data.summary.unchanged).toBe(adminProducts.length);
  });

  it('previews then commits a stock import; the dry run writes nothing', () => {
    const csv = `sku;stock\r\n${sku};42\r\n`;
    const preview = upload(csv, 'type=stock&dryRun=true');
    expect(preview.data.rows[0]).toMatchObject({
      row: 2,
      action: 'update',
      changes: { stock: { from: first.stock, to: 42 } },
    });
    expect(admin('GET', `admin/products/${first.id}`).data.stock).toBe(first.stock);
    const commit = upload(csv, 'type=stock&dryRun=false');
    expect(commit.data.dryRun).toBe(false);
    expect(admin('GET', `admin/products/${first.id}`).data.stock).toBe(42);
  });

  it('rejects stale stock, unknown SKUs and Excel-mangled SKUs with row numbers (422)', () => {
    const variantId = first.variants[0].id;
    const csv = [
      'sku,variant_id,stock,stock_baseline',
      `${sku},${variantId},30,${first.stock + 1}`,
      '',
      `1.23E+12,${lowSeed.variants[0].id},,`,
    ].join('\r\n');
    const res = upload(csv, 'type=products&dryRun=true');
    expect(res.status).toBe(422);
    const rows = res.error.details.rows;
    expect(rows.map((r: Json) => [r.row, r.action, r.errors[0]?.code])).toEqual([
      [2, 'reject', 'STALE_STOCK'],
      [4, 'reject', 'SKU_MISMATCH'],
    ]);
    expect(res.error.details.summary.rejected).toBe(2);
  });

  it('creates a product from new rows and requires title and price', () => {
    const csv = 'sku,title,price,stock\r\nNEW-1,Kopi Toraja,90000,5\r\nNEW-2,,,1\r\n';
    const res = upload(csv, 'type=products&dryRun=true');
    expect(res.status).toBe(422);
    expect(res.error.details.rows[1].errors.map((e: Json) => e.code)).toEqual([
      'MISSING_FOR_CREATE',
      'MISSING_FOR_CREATE',
    ]);
    const ok = upload(
      'sku,title,price,stock\r\nNEW-1,Kopi Toraja,90000,5\r\n',
      'type=products&dryRun=false',
    );
    expect(ok.data.rows[0]).toMatchObject({ action: 'create', slug: 'kopi-toraja' });
    const created = admin('GET', 'admin/products', null, 'search=toraja').data[0];
    expect(created).toMatchObject({ title: 'Kopi Toraja', price: 90000, stock: 5 });
  });

  it('fails closed on header problems and unsupported files', () => {
    expect(upload('sku,colour\r\nA,red\r\n', 'type=products').error).toMatchObject({
      code: 'INVALID_HEADER',
      details: { header: 'colour' },
    });
    expect(upload('sku,sku\r\n', 'type=products').error.code).toBe('DUPLICATE_HEADER');
    expect(upload('sku\r\nA\r\n', 'type=stock').error).toMatchObject({
      code: 'MISSING_HEADER',
      details: { header: 'stock' },
    });
    expect(upload('PK\u0003\u0004', 'type=products', 'book.xlsx').error.code).toBe(
      'UNSUPPORTED_FILE',
    );
    expect(upload('', 'type=products').error.code).toBe('EMPTY_FILE');
    expect(upload('sku\r\n"A\r\n', 'type=products').error.code).toBe('INVALID_CSV');
    expect(upload('sku\r\nA\r\n', 'type=bogus').status).toBe(400);
  });

  it('stores formula-escaped and non-ASCII text literally', () => {
    const csv = `sku,variant_id,title\r\n${sku},${first.variants[0].id},'=1+1 Kopi Gayo — Aceh\r\n`;
    const res = upload(csv, 'type=products&dryRun=false');
    expect(res.data.rows[0].changes.title.to).toBe('=1+1 Kopi Gayo — Aceh');
    expect(admin('GET', `admin/products/${first.id}`).data.title).toBe('=1+1 Kopi Gayo — Aceh');
  });
});
