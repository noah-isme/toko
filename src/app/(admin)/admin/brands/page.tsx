'use client';

import { Building2 } from 'lucide-react';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import {
  useAdminBrands,
  useCreateAdminBrand,
  useDeleteAdminBrand,
  useUpdateAdminBrand,
} from '@/lib/api/hooks.admin';

export default function BrandsPage() {
  return (
    <TaxonomyManager
      title="Brands"
      description="Manage product brands"
      entityLabel="Brand"
      icon={Building2}
      query={useAdminBrands()}
      createMutation={useCreateAdminBrand()}
      updateMutation={useUpdateAdminBrand()}
      deleteMutation={useDeleteAdminBrand()}
    />
  );
}
