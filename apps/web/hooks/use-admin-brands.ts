'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrandInput } from '@repo/contracts';
import { adminBrandsApi } from '@/lib/api/admin/brands';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const KEY = ['admin-brands'];

export function useAdminBrands() {
  return useQuery({ queryKey: KEY, queryFn: adminBrandsApi.list });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandInput) => adminBrandsApi.create(input),
    ...writeMutationCallbacks(
      queryClient,
      [KEY],
      'Đã thêm thương hiệu',
      'Không thể thêm thương hiệu',
    ),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrandInput }) =>
      adminBrandsApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [KEY],
      'Đã cập nhật thương hiệu',
      'Không thể cập nhật thương hiệu',
    ),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBrandsApi.remove(id),
    ...deleteMutationCallbacks(queryClient, KEY, 'Đã xoá thương hiệu', 'Không thể xoá thương hiệu'),
  });
}
