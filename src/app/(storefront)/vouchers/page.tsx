'use client';

import { ArrowRight, Calendar, Copy, Percent, Tag } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { promotionsApi, type PublicVoucher } from '@/lib/api/services/promotions';
import { formatCurrency } from '@/lib/api/utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

type VouchersTranslator = ReturnType<typeof useTranslations<'catalog.vouchers'>>;

function discountLabel(t: VouchersTranslator, voucher: PublicVoucher) {
  if (voucher.kind === 'percent') {
    return t('percentOff', { percent: String((voucher.percentBps ?? 0) / 100) });
  }
  return formatCurrency(voucher.value);
}

function voucherDescription(t: VouchersTranslator, voucher: PublicVoucher) {
  const details: string[] = [];
  if (voucher.minSpend > 0)
    details.push(t('minSpend', { amount: formatCurrency(voucher.minSpend) }));
  if (voucher.usageLimit != null)
    details.push(t('remaining', { count: Math.max(0, voucher.usageLimit - voucher.usedCount) }));
  if (voucher.perUserLimit != null && voucher.perUserLimit > 0)
    details.push(t('perUser', { limit: voucher.perUserLimit }));
  return details.join(' • ');
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function VouchersPage() {
  const t = useTranslations('catalog.vouchers');
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    promotionsApi
      .listVouchers()
      .then((items) => {
        if (!cancelled) setVouchers(items);
      })
      .catch(() => {
        if (!cancelled) setError(t('loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ variant: 'success', description: t('copied', { code }) });
  };

  if (loading)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">{t('howToTitle')}</p>
        <p className="mt-1">{t('howTo')}</p>
      </div>
      {vouchers.length === 0 ? (
        <div className="py-12 text-center">
          <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('emptyTitle')}</h2>
          <p className="mt-1 text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vouchers.map((voucher) => (
            <Card key={voucher.id} className="relative overflow-hidden transition hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-lg font-bold">{voucher.code}</span>
                      <Badge variant={voucher.kind === 'percent' ? 'default' : 'secondary'}>
                        {voucher.kind === 'percent' ? (
                          <>
                            <Percent className="mr-1 h-3 w-3" />
                            {t('percent')}
                          </>
                        ) : (
                          <>
                            <Tag className="mr-1 h-3 w-3" />
                            {t('fixed')}
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {discountLabel(t, voucher)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void copyCode(voucher.code)}
                    aria-label={t('copyCode', { code: voucher.code })}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {voucherDescription(t, voucher) || t('termsApply')}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t('valid')}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {voucher.validTo
                      ? t('validUntil', { date: formatDate(voucher.validTo) })
                      : t('noExpiry')}
                  </div>
                </div>
                {voucher.combinable && <Badge variant="outline">{t('combinable')}</Badge>}
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className={cn(
                    'w-full',
                    voucher.kind === 'fixed_amount' &&
                      'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  <Link href={`/products?promo=${encodeURIComponent(voucher.code)}`}>
                    {t('shopNow')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <div className="rounded-lg border p-6 text-center">
        <h3 className="mb-2 font-semibold">{t('helpTitle')}</h3>
        <p className="mb-4 text-muted-foreground">{t('helpDescription')}</p>
        <a href="/account/support" className="font-medium text-primary hover:underline">
          {t('contactSupport')}
        </a>
      </div>
    </div>
  );
}
