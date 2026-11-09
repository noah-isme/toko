'use client';

import { BellRing } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The current page (path + query) to come back to after signing in. */
export function currentReturnPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}` || '/';
}

interface AlertLoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Same-origin path the login page sends the shopper back to. */
  returnTo: string;
}

/** Shown to signed-out shoppers who try to turn on a product alert. */
export function AlertLoginPrompt({ open, onOpenChange, returnTo }: AlertLoginPromptProps) {
  const t = useTranslations('product.alerts.login');
  const loginHref = `/login?redirect=${encodeURIComponent(returnTo)}` as Route;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-accent text-primary">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button asChild>
            <Link href={loginHref}>{t('signIn')}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
