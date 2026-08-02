import { describe, expect, it } from 'vitest';

import { customerOperationsApi, adminOperationsApi } from '@/lib/api/services/customerOperations';
import { paymentApi } from '@/lib/api/services/payment';
import { privacyApi } from '@/lib/api/services/privacy';

describe('new storefront flow MSW parity', () => {
  it('supports privacy export and account deletion', async () => {
    const exported = await privacyApi.exportData();

    expect(exported.profile).toHaveProperty('email');
    await expect(privacyApi.deleteAccount()).resolves.toBeUndefined();
  });

  it('supports customer returns and support conversation history', async () => {
    const createdReturn = await customerOperationsApi.createReturn(
      'order-mock-001',
      'Produk rusak',
      'Kemasan penyok',
    );
    expect(createdReturn.status).toBe('REQUESTED');

    const tickets = await customerOperationsApi.listTickets();
    expect(tickets.length).toBeGreaterThan(0);

    const ticket = tickets[0];
    const before = await customerOperationsApi.listTicketMessages(ticket.id);
    expect(before.length).toBeGreaterThan(0);

    await customerOperationsApi.sendTicketMessage(ticket.id, 'Terima kasih informasinya.');
    const after = await customerOperationsApi.listTicketMessages(ticket.id);
    expect(after.at(-1)?.message).toBe('Terima kasih informasinya.');
  });

  it('supports admin return and support operations', async () => {
    const returns = await adminOperationsApi.listReturns();
    expect(returns.length).toBeGreaterThan(0);
    await expect(adminOperationsApi.updateReturn(returns[0].id, 'APPROVED')).resolves.toBeDefined();

    const tickets = await adminOperationsApi.listTickets();
    const messages = await adminOperationsApi.listTicketMessages(tickets[0].id);
    expect(messages.length).toBeGreaterThan(0);
    await expect(
      adminOperationsApi.sendTicketMessage(tickets[0].id, 'Kami sedang memproses permintaan Anda.'),
    ).resolves.toBeDefined();
  });

  it('supports payment proof upload', async () => {
    const file = new File(['mock proof'], 'proof.png', { type: 'image/png' });
    const response = await paymentApi.uploadProof('order-mock-001', file);

    expect(response.data.orderId).toBe('order-mock-001');
    expect(response.data.filename).toBe('payment-proof');
  });
});
