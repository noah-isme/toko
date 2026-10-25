// @vitest-environment node
/** The `/api/v1` route sends binary mock results (invoice PDFs) verbatim. */
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/v1/[[...path]]/route';

async function get(path: string) {
  const req = new NextRequest(new URL(`http://localhost:3000/api/v1/${path}`), {
    headers: { cookie: 'mockSessionId=binary-session; X-CSRF-Token=csrf' },
  });
  return GET(req, { params: Promise.resolve({ path: path.split('/') }) });
}

describe('mock route binary responses', () => {
  it('streams the invoice PDF with its own headers', async () => {
    const res = await get('orders/order-1001/invoice');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="INV-\d{4}-\d{6}\.pdf"$/,
    );
    const text = Buffer.from(await res.arrayBuffer()).toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
  });

  it('keeps JSON errors and the default cache policy for unpaid orders', async () => {
    const res = await get('orders/order-pending-1/invoice');

    expect(res.status).toBe(409);
    expect(res.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(await res.json()).toMatchObject({ error: { code: 'INVOICE_NOT_AVAILABLE' } });
  });
});
