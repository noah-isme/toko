'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { ProductForm } from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import { useAdminBrands, useAdminCategories, useCreateAdminProduct } from '@/entities/admin/hooks';
import type { AdminProductInput } from '@/entities/admin/types';
import { useToast } from '@/shared/ui/toast';

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createProduct = useCreateAdminProduct();
  // The form's category/brand pickers share these queries; gate the form on them.
  const categories = useAdminCategories();
  const brands = useAdminBrands();
  const taxonomyError = categories.error ?? brands.error;
  const retryTaxonomy = () => {
    if (categories.isError) void categories.refetch();
    if (brands.isError) void brands.refetch();
  };

  const handleSubmit = async (input: AdminProductInput) => {
    try {
      const created = await createProduct.mutateAsync(input);
      toast({ title: 'Product created', description: created.slug, variant: 'success' });
      router.push('/admin/products' as never);
    } catch (error) {
      toast({
        title: 'Could not create product',
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
        <AdminPageHeader title="New Product" description="Add a new product to your catalog" />
      </div>

      {categories.isPending || brands.isPending ? (
        <AdminLoading />
      ) : taxonomyError ? (
        <AdminError error={taxonomyError} onRetry={retryTaxonomy} />
      ) : (
        <ProductForm
          submitLabel="Create Product"
          saving={createProduct.isPending}
          onSubmit={handleSubmit}
          onError={(message) => toast({ title: message, variant: 'destructive' })}
          onCancel={() => router.push('/admin/products' as never)}
        />
      )}
    </div>
  );
}
