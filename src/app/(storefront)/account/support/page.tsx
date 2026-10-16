'use client';

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  customerOperationsApi,
  type SupportMessage,
  type SupportTicket,
} from '@/lib/api/services/customerOperations';
import { FULL_DATE_TIME, useFormat } from '@/shared/i18n/use-format';

type MessageMap = Record<string, SupportMessage[]>;

export default function SupportPage() {
  const t = useTranslations('account.support');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const fmt = useFormat();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<MessageMap>({});
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
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
      setNotice(t('loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await customerOperationsApi.createTicket(subject, message, orderId);
      setSubject('');
      setMessage('');
      setOrderId('');
      setNotice(t('created'));
      await load();
    } catch {
      setNotice(t('createFailed'));
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
      setNotice(t('replySent'));
      await load();
    } catch {
      setNotice(t('replyFailed'));
    }
  };

  if (authLoading) return <div className="py-16 text-center">{tCommon('loading')}</div>;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('guestDescription')}</p>
        <Button asChild className="mt-6">
          <a href="/login">{tAccount('login')}</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('newTicket')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder={t('subject')}
            />
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder={t('orderNumber')}
            />
            <textarea
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2"
              placeholder={t('message')}
            />
            <Button disabled={saving}>{saving ? t('sending') : t('create')}</Button>
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
            <CardContent className="p-6 text-muted-foreground">{t('empty')}</CardContent>
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
                  {t('createdAt', { date: fmt.date(ticket.createdAt, FULL_DATE_TIME) })}
                  {ticket.orderId ? ` • ${t('order', { orderId: ticket.orderId })}` : ''}
                </p>
                <div
                  aria-label={t('conversation', { subject: ticket.subject })}
                  className="space-y-2 rounded-md bg-muted/40 p-3"
                >
                  {(messages[ticket.id] ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noMessages')}</p>
                  ) : (
                    messages[ticket.id].map((entry) => (
                      <div key={entry.id} className="rounded-md border bg-background p-3 text-sm">
                        <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>{entry.authorType === 'customer' ? t('you') : t('team')}</span>
                          <time dateTime={entry.createdAt}>
                            {fmt.date(entry.createdAt, FULL_DATE_TIME)}
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
                    placeholder={t('replyPlaceholder')}
                  />
                  <Button variant="outline" onClick={() => void send(ticket.id)}>
                    {t('send')}
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
