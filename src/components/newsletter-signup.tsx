'use client';

import { Mail, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newsletterApi } from '@/lib/api/services';
import { cn } from '@/lib/utils';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';

const ENABLE_NEWSLETTER = true; // Enabled with full-stack backend & Resend

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setStatus('error');
      setMessage('Silakan masukkan alamat email yang valid.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await newsletterApi.subscribe(cleanEmail);
      capturePosthogEvent('newsletter_subscribed', { email: cleanEmail });

      setStatus('success');
      setMessage(res?.message || 'Terima kasih telah berlangganan buletin kami!');
      setEmail('');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 6000);
    } catch (err: unknown) {
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      setMessage(errorMsg);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Subscribe to our newsletter</h3>
        <p className="text-sm text-muted-foreground">
          Get the latest updates on new products and upcoming sales
        </p>
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
              placeholder={
                ENABLE_NEWSLETTER ? 'Enter your email' : 'Subscription temporarily disabled'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={!ENABLE_NEWSLETTER || status === 'loading' || status === 'success'}
              aria-label="Email address"
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
              'Subscribing...'
            ) : status === 'success' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Subscribed
              </>
            ) : (
              'Subscribe'
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
        {!ENABLE_NEWSLETTER
          ? 'Newsletter subscription is currently unavailable.'
          : 'By subscribing, you agree to our Privacy Policy and consent to receive updates from our company.'}
      </p>
    </div>
  );
}
