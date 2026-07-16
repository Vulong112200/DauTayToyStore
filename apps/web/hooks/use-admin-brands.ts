'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrandInput } from '@repo/contracts';
import { adminBrandsApi } from '@/lib/api/admin/brands';

const KEY = ['admin-brands'];

export function useAdminBrands() {
  return useQuery({ queryKey: KEY, queryFn: adminBrandsApi.list });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandInput) => adminBrandsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrandInput }) =>
      adminBrandsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBrandsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
