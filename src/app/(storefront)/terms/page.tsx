import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('common.legal.terms');
  return (
    <article className="prose prose-slate dark:prose-invert max-w-3xl">
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>
      <h2>{t('ordersTitle')}</h2>
      <p>{t('orders')}</p>
      <h2>{t('returnsTitle')}</h2>
      <p>{t.rich('returns', { link: (chunks) => <a href="/returns">{chunks}</a> })}</p>
      <h2>{t('supportTitle')}</h2>
      <p>{t.rich('support', { link: (chunks) => <a href="/account/support">{chunks}</a> })}</p>
    </article>
  );
}
