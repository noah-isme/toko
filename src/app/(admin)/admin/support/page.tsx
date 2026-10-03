'use client';

import { useState } from 'react';

import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useAdminTicketMessages,
  useAdminTickets,
  useSendAdminTicketMessage,
  useUpdateAdminTicket,
} from '@/entities/admin/hooks';
import type { TicketStatus } from '@/entities/admin/types';

const statuses: TicketStatus[] = [
  'OPEN',
  'PENDING_CUSTOMER',
  'PENDING_AGENT',
  'RESOLVED',
  'CLOSED',
];

function TicketMessages({ ticketId }: { ticketId: string }) {
  const { data: messages = [] } = useAdminTicketMessages(ticketId);
  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-3">
      {messages.map((entry) => (
        <div key={entry.id} className="rounded-md border bg-background p-3 text-sm">
          <p className="mb-1 text-xs text-muted-foreground">
            {entry.authorType === 'customer' ? 'Customer' : 'Agent'} •{' '}
            {new Date(entry.createdAt).toLocaleString()}
          </p>
          <p className="whitespace-pre-wrap">{entry.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminSupportPage() {
  const ticketsQuery = useAdminTickets();
  const updateTicket = useUpdateAdminTicket();
  const sendMessage = useSendAdminTicketMessage();
  const [reply, setReply] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const items = ticketsQuery.data ?? [];

  const update = async (id: string, status: TicketStatus) => {
    try {
      await updateTicket.mutateAsync({ id, status });
    } catch {
      setError('Gagal memperbarui tiket.');
    }
  };

  const send = async (id: string) => {
    const text = reply[id]?.trim();
    if (!text) return;
    try {
      await sendMessage.mutateAsync({ id, message: text });
      setReply((value) => ({ ...value, [id]: '' }));
    } catch {
      setError('Gagal mengirim balasan.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Support" description="Respond to customer support tickets" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ticketsQuery.isPending ? (
        <AdminLoading />
      ) : ticketsQuery.isError ? (
        <AdminError error={ticketsQuery.error} onRetry={() => void ticketsQuery.refetch()} />
      ) : items.length === 0 ? (
        <AdminEmpty message="No support tickets." />
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
                <TicketMessages ticketId={item.id} />
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
