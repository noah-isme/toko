import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

type MockReturn = {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  reason: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
};

type MockMessage = {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'customer' | 'agent';
  message: string;
  createdAt: string;
};

const mockUserId = 'mock-user-001';
const mockReturns: MockReturn[] = [
  {
    id: 'return-mock-001',
    orderId: 'order-mock-001',
    userId: mockUserId,
    status: 'REQUESTED',
    reason: 'Produk tidak sesuai',
    notes: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
const mockTickets: MockTicket[] = [
  {
    id: 'ticket-mock-001',
    subject: 'Contoh tiket dukungan',
    status: 'PENDING_CUSTOMER',
    priority: 'NORMAL',
    orderId: 'order-mock-001',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
const mockMessages: Record<string, MockMessage[]> = {
  'ticket-mock-001': [
    {
      id: 'message-mock-001',
      ticketId: 'ticket-mock-001',
      authorId: mockUserId,
      authorType: 'customer',
      message: 'Boleh dibantu cek status pesanan saya?',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'message-mock-002',
      ticketId: 'ticket-mock-001',
      authorId: 'mock-agent-001',
      authorType: 'agent',
      message: 'Pesanan sedang diproses. Kami akan memberi kabar berikutnya.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

function ticketMessages(ticketId: string) {
  return mockMessages[ticketId] ?? [];
}

function messageResponse(ticketId: string, message: string, authorType: MockMessage['authorType']) {
  const entry: MockMessage = {
    id: faker.string.uuid(),
    ticketId,
    authorId: authorType === 'customer' ? mockUserId : 'mock-agent-001',
    authorType,
    message,
    createdAt: new Date().toISOString(),
  };
  mockMessages[ticketId] = [...ticketMessages(ticketId), entry];
  return entry;
}

export const customerOperationsHandlers = [
  http.get(apiPath('/users/me/data-export'), () =>
    HttpResponse.json({
      data: {
        profile: {
          id: mockUserId,
          name: 'Toko Demo',
          email: 'demo@toko.test',
          phone: '+628123456789',
          createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
        },
        orders: [],
        exportedAt: new Date().toISOString(),
      },
    }),
  ),
  http.delete(apiPath('/users/me'), () => new HttpResponse(null, { status: 204 })),

  http.get(apiPath('/returns'), () => HttpResponse.json({ data: mockReturns })),
  http.get(apiPath('/returns/:returnId'), ({ params }) => {
    const item = mockReturns.find((entry) => entry.id === String(params.returnId));
    return item
      ? HttpResponse.json({ data: item })
      : HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'return not found' } },
          { status: 404 },
        );
  }),
  http.post(apiPath('/orders/:orderId/returns'), async ({ params, request }) => {
    const payload = (await request.json()) as { reason?: string; notes?: string };
    const now = new Date().toISOString();
    const item: MockReturn = {
      id: faker.string.uuid(),
      orderId: String(params.orderId),
      userId: mockUserId,
      status: 'REQUESTED',
      reason: payload.reason ?? 'Alasan pengembalian',
      notes: payload.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockReturns.unshift(item);
    return HttpResponse.json({ data: item }, { status: 201 });
  }),

  http.get(apiPath('/support/tickets'), () => HttpResponse.json({ data: mockTickets })),
  http.post(apiPath('/support/tickets'), async ({ request }) => {
    const payload = (await request.json()) as {
      subject?: string;
      message?: string;
      orderId?: string;
    };
    const now = new Date().toISOString();
    const ticket: MockTicket = {
      id: faker.string.uuid(),
      subject: payload.subject ?? 'Tiket baru',
      status: 'OPEN',
      priority: 'NORMAL',
      orderId: payload.orderId || undefined,
      createdAt: now,
      updatedAt: now,
    };
    mockTickets.unshift(ticket);
    messageResponse(ticket.id, payload.message ?? '', 'customer');
    return HttpResponse.json({ data: ticket }, { status: 201 });
  }),
  http.get(apiPath('/support/tickets/:ticketId/messages'), ({ params }) =>
    HttpResponse.json({ data: ticketMessages(String(params.ticketId)) }),
  ),
  http.post(apiPath('/support/tickets/:ticketId/messages'), async ({ params, request }) => {
    const payload = (await request.json()) as { message?: string };
    const ticket = mockTickets.find((entry) => entry.id === String(params.ticketId));
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'ticket not found' } },
        { status: 404 },
      );
    }
    ticket.status = 'PENDING_AGENT';
    ticket.updatedAt = new Date().toISOString();
    const entry = messageResponse(String(params.ticketId), payload.message ?? '', 'customer');
    return HttpResponse.json({ data: entry }, { status: 201 });
  }),

  http.get(apiPath('/admin/returns'), () => HttpResponse.json({ data: mockReturns })),
  http.patch(apiPath('/admin/returns/:returnId'), async ({ params, request }) => {
    const item = mockReturns.find((entry) => entry.id === String(params.returnId));
    if (!item)
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'return not found' } },
        { status: 404 },
      );
    const payload = (await request.json()) as { status?: string };
    item.status = payload.status ?? item.status;
    item.updatedAt = new Date().toISOString();
    return HttpResponse.json({ data: item });
  }),
  http.post(apiPath('/admin/returns/:returnId/refund'), ({ params }) => {
    const item = mockReturns.find((entry) => entry.id === String(params.returnId));
    if (!item)
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'return not found' } },
        { status: 404 },
      );
    item.status = 'REFUNDED';
    item.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      data: { id: faker.string.uuid(), returnId: item.id, status: 'SUCCEEDED' },
    });
  }),
  http.get(apiPath('/admin/support/tickets'), () => HttpResponse.json({ data: mockTickets })),
  http.get(apiPath('/admin/support/tickets/:ticketId/messages'), ({ params }) =>
    HttpResponse.json({ data: ticketMessages(String(params.ticketId)) }),
  ),
  http.patch(apiPath('/admin/support/tickets/:ticketId'), async ({ params, request }) => {
    const ticket = mockTickets.find((entry) => entry.id === String(params.ticketId));
    if (!ticket)
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'ticket not found' } },
        { status: 404 },
      );
    const payload = (await request.json()) as { status?: string };
    ticket.status = payload.status ?? ticket.status;
    ticket.updatedAt = new Date().toISOString();
    return HttpResponse.json({ data: ticket });
  }),
  http.post(apiPath('/admin/support/tickets/:ticketId/messages'), async ({ params, request }) => {
    const ticket = mockTickets.find((entry) => entry.id === String(params.ticketId));
    if (!ticket)
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'ticket not found' } },
        { status: 404 },
      );
    const payload = (await request.json()) as { message?: string };
    ticket.status = 'PENDING_CUSTOMER';
    ticket.updatedAt = new Date().toISOString();
    const entry = messageResponse(String(params.ticketId), payload.message ?? '', 'agent');
    return HttpResponse.json({ data: entry }, { status: 201 });
  }),
];
