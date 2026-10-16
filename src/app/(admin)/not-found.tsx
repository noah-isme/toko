import { useTranslations } from 'next-intl';

import { NotFoundView } from '@/shared/ui/NotFoundView';

export default function AdminNotFound() {
  const t = useTranslations('admin.notFound');
  return <NotFoundView homeHref="/admin" homeLabel={t('back')} />;
}
