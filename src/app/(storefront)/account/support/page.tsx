'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  customerOperationsApi,
  type SupportMessage,
  type SupportTicket,
} from '@/lib/api/services/customerOperations';

type MessageMap = Record<string, SupportMessage[]>;

export default function SupportPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<MessageMap>({});
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const nextTickets = await customerOperationsApi.listTickets();
      const messageEntries = await Promise.all(
        nextTickets.map(
          async (ticket) =>
            [ticket.id, await customerOperationsApi.listTicketMessages(ticket.id)] as const,
        ),
      );
      setTickets(nextTickets);
      setMessages(Object.fromEntries(messageEntries));
    } catch {
      setNotice('Gagal memuat tiket dukungan.');
    }
  };

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await customerOperationsApi.createTicket(subject, message, orderId);
      setSubject('');
      setMessage('');
      setOrderId('');
      setNotice('Tiket berhasil dibuat.');
      await load();
    } catch {
      setNotice('Gagal membuat tiket.');
    } finally {
      setSaving(false);
    }
  };

  const send = async (ticketId: string) => {
    const text = reply[ticketId]?.trim();
    if (!text) return;
    try {
      await customerOperationsApi.sendTicketMessage(ticketId, text);
      setReply((current) => ({ ...current, [ticketId]: '' }));
      setNotice('Balasan terkirim.');
      await load();
    } catch {
      setNotice('Gagal mengirim balasan.');
    }
  };

  if (authLoading) return <div className="py-16 text-center">Memuat...</div>;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Pusat Bantuan</h1>
        <p className="mt-2 text-muted-foreground">Silakan login untuk membuat dan melihat tiket.</p>
        <Button asChild className="mt-6">
          <a href="/login">Login</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pusat Bantuan</h1>
        <p className="text-muted-foreground">
          Buat tiket dan lanjutkan percakapan dengan tim kami.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tiket baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Subjek"
            />
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Nomor order (opsional)"
            />
            <textarea
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
              placeholder="Jelaskan kendala Anda"
            />
            <Button disabled={saving}>{saving ? 'Mengirim...' : 'Buat tiket'}</Button>
          </form>
        </CardContent>
      </Card>

      {notice && (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      )}

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">Belum ada tiket.</CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex flex-wrap justify-between gap-2">
                  <CardTitle className="text-base">{ticket.subject}</CardTitle>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">{ticket.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Dibuat {new Date(ticket.createdAt).toLocaleString('id-ID')}
                  {ticket.orderId ? ` • Order ${ticket.orderId}` : ''}
                </p>
                <div
                  aria-label={`Percakapan tiket ${ticket.subject}`}
                  className="space-y-2 rounded-md bg-muted/40 p-3"
                >
                  {(messages[ticket.id] ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
                  ) : (
                    messages[ticket.id].map((entry) => (
                      <div key={entry.id} className="rounded-md border bg-background p-3 text-sm">
                        <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>{entry.authorType === 'customer' ? 'Anda' : 'Tim dukungan'}</span>
                          <time dateTime={entry.createdAt}>
                            {new Date(entry.createdAt).toLocaleString('id-ID')}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap">{entry.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={reply[ticket.id] ?? ''}
                    onChange={(event) =>
                      setReply((current) => ({ ...current, [ticket.id]: event.target.value }))
                    }
                    className="flex-1 rounded-md border bg-background px-3 py-2"
                    placeholder="Tulis balasan"
                  />
                  <Button variant="outline" onClick={() => void send(ticket.id)}>
                    Kirim
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
