'use client';

import { useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  adminOperationsApi,
  type SupportMessage,
  type SupportTicket,
  type TicketStatus,
} from '@/lib/api/services/customerOperations';

const statuses: TicketStatus[] = [
  'OPEN',
  'PENDING_CUSTOMER',
  'PENDING_AGENT',
  'RESOLVED',
  'CLOSED',
];

export default function AdminSupportPage() {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<Record<string, SupportMessage[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const tickets = await adminOperationsApi.listTickets();
      const entries = await Promise.all(
        tickets.map(
          async (ticket) =>
            [ticket.id, await adminOperationsApi.listTicketMessages(ticket.id)] as const,
        ),
      );
      setItems(tickets);
      setMessages(Object.fromEntries(entries));
    } catch {
      setError('Gagal memuat tiket.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = async (id: string, status: TicketStatus) => {
    try {
      await adminOperationsApi.updateTicket(id, status);
      await load();
    } catch {
      setError('Gagal memperbarui tiket.');
    }
  };

  const send = async (id: string) => {
    const text = reply[id]?.trim();
    if (!text) return;
    try {
      await adminOperationsApi.sendTicketMessage(id, text);
      setReply((value) => ({ ...value, [id]: '' }));
      await load();
    } catch {
      setError('Gagal mengirim balasan.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Support" description="Respond to customer support tickets" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">No support tickets.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.priority} • {item.status}
                      {item.orderId ? ` • Order ${item.orderId}` : ''}
                    </p>
                  </div>
                  <select
                    value={item.status}
                    onChange={(event) => void update(item.id, event.target.value as TicketStatus)}
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 rounded-md bg-muted/40 p-3">
                  {(messages[item.id] ?? []).map((entry) => (
                    <div key={entry.id} className="rounded-md border bg-background p-3 text-sm">
                      <p className="mb-1 text-xs text-muted-foreground">
                        {entry.authorType === 'customer' ? 'Customer' : 'Agent'} •{' '}
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap">{entry.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={reply[item.id] ?? ''}
                    onChange={(event) =>
                      setReply((value) => ({ ...value, [item.id]: event.target.value }))
                    }
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Reply to customer"
                  />
                  <Button size="sm" onClick={() => void send(item.id)}>
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
