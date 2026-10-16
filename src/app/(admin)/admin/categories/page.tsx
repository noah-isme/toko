'use client';

import { Layers } from 'lucide-react';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '@/entities/admin/hooks';

export default function CategoriesPage() {
  return (
    <TaxonomyManager
      kind="categories"
      icon={Layers}
      query={useAdminCategories()}
      createMutation={useCreateAdminCategory()}
      updateMutation={useUpdateAdminCategory()}
      deleteMutation={useDeleteAdminCategory()}
    />
  );
}
