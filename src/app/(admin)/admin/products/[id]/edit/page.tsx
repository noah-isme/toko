'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { ProductForm, productToFormValues } from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import { useAdminProduct, useUpdateAdminProduct } from '@/entities/admin/hooks';
import type { AdminProductInput } from '@/entities/admin/types';
import { ApiClientError } from '@/lib/api/apiClient';
import { useToast } from '@/shared/ui/toast';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = typeof params.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const t = useTranslations('admin.products');
  const tCommon = useTranslations('admin.common');
  const { toast } = useToast();

  const query = useAdminProduct(productId);
  const updateProduct = useUpdateAdminProduct();

  const handleSubmit = async (input: AdminProductInput) => {
    if (!productId) return;
    try {
      await updateProduct.mutateAsync({ id: productId, data: input });
      toast({ title: t('toast.updated'), description: input.title, variant: 'success' });
      router.push('/admin/products' as never);
    } catch (error) {
      toast({
        title: t('toast.updateFailed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  if (query.error instanceof ApiClientError && query.error.status === 404) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={'/admin/products' as never} aria-label={t('back')}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <AdminPageHeader
          title={t('edit.title')}
          description={query.data ? query.data.title : t('edit.description')}
        />
      </div>

      {query.isLoading ? (
        <AdminLoading label={t('edit.loading')} />
      ) : query.isError ? (
        <AdminError error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <ProductForm
          // Remount when the loaded product changes so form state is seeded once.
          key={query.data.id}
          initialValues={productToFormValues(query.data)}
          submitLabel={t('edit.submit')}
          saving={updateProduct.isPending}
          onSubmit={handleSubmit}
          onError={(message) => toast({ title: message, variant: 'destructive' })}
          onCancel={() => router.push('/admin/products' as never)}
        />
      ) : null}
    </div>
  );
}
