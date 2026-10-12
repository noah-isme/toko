import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Container } from '@/components/layout/container';
import { NewsletterSignup } from '@/components/newsletter-signup';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t bg-muted/30 pb-24 text-sm text-muted-foreground md:pb-0">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NewsletterSignup />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t('quickLinks.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  {t('quickLinks.products')}
                </Link>
              </li>
              <li>
                <a href="/about" className="hover:text-foreground">
                  {t('quickLinks.about')}
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-foreground">
                  {t('quickLinks.contact')}
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-foreground">
                  {t('quickLinks.faq')}
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t('legal.title')}</h3>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="hover:text-foreground">
                  {t('legal.privacy')}
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-foreground">
                  {t('legal.terms')}
                </a>
              </li>
              <li>
                <a href="/shipping" className="hover:text-foreground">
                  {t('legal.shipping')}
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-foreground">
                  {t('legal.returns')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <Container className="border-t py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground">
              {t('privacy')}
            </a>
            <a href="/terms" className="hover:text-foreground">
              {t('terms')}
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
