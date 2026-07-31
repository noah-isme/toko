'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { ProductForm, productToFormValues } from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import { useAdminProduct, useUpdateAdminProduct } from '@/lib/api/hooks.admin';
import type { AdminProductInput } from '@/lib/api/services/admin';
import { useToast } from '@/shared/ui/toast';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = typeof params.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { toast } = useToast();

  const query = useAdminProduct(productId);
  const updateProduct = useUpdateAdminProduct();

  const handleSubmit = async (input: AdminProductInput) => {
    if (!productId) return;
    try {
      await updateProduct.mutateAsync({ id: productId, data: input });
      toast({ title: 'Product updated', description: input.title, variant: 'success' });
      router.push('/admin/products' as never);
    } catch (error) {
      toast({
        title: 'Could not update product',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={'/admin/products' as never} aria-label="Back to products">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <AdminPageHeader
          title="Edit Product"
          description={query.data ? query.data.title : 'Update product details'}
        />
      </div>

      {query.isLoading ? (
        <AdminLoading label="Loading product..." />
      ) : query.isError ? (
        <AdminError error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <ProductForm
          // Remount when the loaded product changes so form state is seeded once.
          key={query.data.id}
          initialValues={productToFormValues(query.data)}
          submitLabel="Save Changes"
          saving={updateProduct.isPending}
          onSubmit={handleSubmit}
          onError={(message) => toast({ title: message, variant: 'destructive' })}
          onCancel={() => router.push('/admin/products' as never)}
        />
      ) : null}
    </div>
  );
}
