import { useTranslations } from 'next-intl';

import { NotFoundView } from '@/shared/ui/NotFoundView';

export default function StorefrontNotFound() {
  const t = useTranslations('notFound');
  return <NotFoundView homeHref="/products" homeLabel={t('allProducts')} />;
}
