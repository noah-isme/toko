'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerOperationsApi, type CustomerReturn } from '@/lib/api/services/customerOperations';
import { FULL_DATE_TIME, useFormat } from '@/shared/i18n/use-format';

export default function ReturnsPage() {
  const t = useTranslations('account.returns');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const fmt = useFormat();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReturns(await customerOperationsApi.listReturns());
    } catch {
      setMessage(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await customerOperationsApi.createReturn(orderId.trim(), reason.trim(), notes.trim());
      setOrderId('');
      setReason('');
      setNotes('');
      setMessage(t('created'));
      await load();
    } catch {
      setMessage(t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="py-16 text-center">{tCommon('loading')}</div>;
  if (!isAuthenticated)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <RotateCcw className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('guestDescription')}</p>
        <Button asChild className="mt-6">
          <a href="/login">{tAccount('login')}</a>
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>{t('orderNumber')}</span>
              <input
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder={t('orderPlaceholder')}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{t('reason')}</span>
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder={t('reasonPlaceholder')}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>{t('notes')}</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <div className="md:col-span-2">
              <Button disabled={saving}>{saving ? t('sending') : t('submit')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t('listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{tCommon('loading')}</p>
          ) : returns.length === 0 ? (
            <p className="text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="space-y-3">
              {returns.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                >
                  <div>
                    <p className="font-medium">{t('order', { orderId: item.orderId })}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt.date(item.createdAt, FULL_DATE_TIME)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
