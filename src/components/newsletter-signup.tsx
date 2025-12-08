'use client';

import { Mail, Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      // TODO: Replace with actual API call when backend supports newsletter
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus('success');
      setMessage('Thank you for subscribing!');
      setEmail('');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
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
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={status === 'loading' || status === 'success'}
              aria-label="Email address"
            />
          </div>
          <Button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
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
        By subscribing, you agree to our Privacy Policy and consent to receive updates from our
        company.
      </p>
    </div>
  );
}
