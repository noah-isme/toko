'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStoreSettings, useUpdateStoreSettings } from '@/entities/admin/hooks';
import { useToast } from '@/shared/ui/toast';

type FormState = {
  storeName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  shippingOrigin: string;
};

export default function SettingsPage() {
  const t = useTranslations('admin.settings');
  const query = useStoreSettings();

  if (query.isLoading) return <AdminLoading label={t('loading')} />;
  if (query.error) return <AdminError error={query.error} onRetry={() => void query.refetch()} />;

  const settings = query.data ?? {};
  const initialForm: FormState = {
    storeName: String(settings.storeName ?? ''),
    description: String(settings.description ?? ''),
    contactEmail: String(settings.contactEmail ?? ''),
    contactPhone: String(settings.contactPhone ?? ''),
    currency: String(settings.currency ?? 'IDR'),
    shippingOrigin: String(settings.shippingOrigin ?? ''),
  };

  return <SettingsForm initialForm={initialForm} />;
}

function SettingsForm({ initialForm }: { initialForm: FormState }) {
  const t = useTranslations('admin.settings');
  const update = useUpdateStoreSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialForm);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    try {
      await update.mutateAsync(form);
      toast({ title: t('toast.saved'), variant: 'success' });
    } catch (error) {
      toast({
        title: t('toast.saveFailed'),
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="storeName">{t('storeName')}</Label>
            <Input
              id="storeName"
              value={form.storeName}
              onChange={(event) => set('storeName', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(event) => set('contactEmail', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(event) => set('contactPhone', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t('currency')}</Label>
            <Input
              id="currency"
              maxLength={3}
              value={form.currency}
              onChange={(event) => set('currency', event.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t('storeDescription')}</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingOrigin">{t('shippingOrigin')}</Label>
            <Input
              id="shippingOrigin"
              placeholder="KOTA_KEDIRI"
              value={form.shippingOrigin}
              onChange={(event) => set('shippingOrigin', event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void save()} disabled={update.isPending}>
              {update.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('onboardingHint')}</p>
          <Button
            variant="outline"
            onClick={async () => {
              await update.mutateAsync({ onboarding: { completed: true } });
              toast({ title: t('toast.onboardingComplete'), variant: 'success' });
            }}
          >
            {t('markComplete')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
