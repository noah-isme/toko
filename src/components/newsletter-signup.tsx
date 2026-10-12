'use client';

import { Mail, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newsletterApi } from '@/lib/api/services';
import { cn } from '@/lib/utils';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';

const ENABLE_NEWSLETTER = true; // Enabled with full-stack backend & Resend

export function NewsletterSignup() {
  const t = useTranslations('footer.newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setStatus('error');
      setMessage(t('invalidEmail'));
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await newsletterApi.subscribe(cleanEmail);
      // Never send the address itself: analytics events must stay free of PII.
      capturePosthogEvent('newsletter_subscribed', { success: true });

      setStatus('success');
      setMessage(res?.message || t('success'));
      setEmail('');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 6000);
    } catch (err: unknown) {
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : t('error');
      setMessage(errorMsg);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="email"
              placeholder={ENABLE_NEWSLETTER ? t('placeholder') : t('placeholderDisabled')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={!ENABLE_NEWSLETTER || status === 'loading' || status === 'success'}
              aria-label={t('emailLabel')}
            />
          </div>
          <Button
            type="submit"
            disabled={!ENABLE_NEWSLETTER || status === 'loading' || status === 'success'}
            className={cn(
              'min-w-[100px]',
              status === 'success' && 'bg-green-600 hover:bg-green-600',
            )}
          >
            {status === 'loading' ? (
              t('submitting')
            ) : status === 'success' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('subscribed')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </div>

        {message && (
          <p
            className={cn('text-sm', status === 'success' ? 'text-green-600' : 'text-destructive')}
            role="alert"
          >
            {message}
          </p>
        )}
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        {!ENABLE_NEWSLETTER ? t('unavailable') : t('consent')}
      </p>
    </div>
  );
}
