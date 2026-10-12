import { useTranslations } from 'next-intl';

export default function ShippingPolicyPage() {
  const t = useTranslations('common.legal.shipping');
  return (
    <article className="prose prose-slate dark:prose-invert max-w-3xl">
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>
      <h2>{t('trackingTitle')}</h2>
      <p>{t('tracking')}</p>
      <h2>{t('issuesTitle')}</h2>
      <p>{t.rich('issues', { link: (chunks) => <a href="/account/support">{chunks}</a> })}</p>
    </article>
  );
}
