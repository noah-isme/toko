import { useTranslations } from 'next-intl';

import { AdminLoading } from '@/components/admin/admin-ui';

export default function AdminDashboardLoading() {
  const t = useTranslations('admin.dashboard');
  return (
    <div className="py-8">
      <AdminLoading label={t('loading')} />
    </div>
  );
}
