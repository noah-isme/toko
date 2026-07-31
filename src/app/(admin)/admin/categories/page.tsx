'use client';

import { Layers } from 'lucide-react';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '@/lib/api/hooks.admin';

export default function CategoriesPage() {
  return (
    <TaxonomyManager
      title="Categories"
      description="Manage product categories"
      entityLabel="Category"
      icon={Layers}
      query={useAdminCategories()}
      createMutation={useCreateAdminCategory()}
      updateMutation={useUpdateAdminCategory()}
      deleteMutation={useDeleteAdminCategory()}
    />
  );
}
