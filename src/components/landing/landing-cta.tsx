import { ArrowRight, Gift, Mail } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { NewsletterSignup } from '@/components/newsletter-signup';
import { Button } from '@/components/ui/button';

export function LandingCTA() {
  const t = useTranslations('common.landing.cta');
  return (
    <section className="shadow-xs rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* Left: Voucher Promo */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
            <Gift className="h-3.5 w-3.5" />
            <span>{t('badge')}</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t('title')}
          </h2>

          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t('description')}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="gap-2 bg-primary font-bold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
            >
              <Link href="/register">
                {t('register')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-semibold transition-all duration-150 active:scale-[0.98]"
            >
              <Link href="/login">{t('login')}</Link>
            </Button>
          </div>
        </div>

        {/* Right: Newsletter Box */}
        <div className="space-y-4 rounded-xl border border-border bg-background p-5">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('newsletterTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('newsletterDescription')}</p>
            </div>
          </div>
          <NewsletterSignup />
        </div>
      </div>
    </section>
  );
}
