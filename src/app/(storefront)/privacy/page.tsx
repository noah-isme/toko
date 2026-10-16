import { useTranslations } from 'next-intl';

export default function PrivacyPolicyPage() {
  const t = useTranslations('common.legal.privacy');
  return (
    <article className="prose prose-slate dark:prose-invert max-w-3xl">
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>
      <h2>{t('storedTitle')}</h2>
      <p>{t('stored')}</p>
      <h2>{t('controlTitle')}</h2>
      <p>{t('control')}</p>
      <h2>{t('contactTitle')}</h2>
      <p>{t.rich('contact', { link: (chunks) => <a href="/account/support">{chunks}</a> })}</p>
    </article>
  );
}
