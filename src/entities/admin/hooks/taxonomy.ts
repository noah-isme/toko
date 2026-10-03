import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminTaxonomyInput } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => adminApi.getCategories(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminTaxonomyInput) => adminApi.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

export function useUpdateAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminTaxonomyInput }) =>
      adminApi.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

export function useDeleteAdminCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: adminKeys.brands(),
    queryFn: () => adminApi.getBrands(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminTaxonomyInput) => adminApi.createBrand(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.brands() });
    },
  });
}

export function useUpdateAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminTaxonomyInput }) =>
      adminApi.updateBrand(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.brands() });
    },
  });
}

export function useDeleteAdminBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.brands() });
    },
  });
}
