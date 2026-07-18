'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryInput } from '@repo/contracts';
import { adminCategoriesApi } from '@/lib/api/admin/categories';
import { deleteMutationCallbacks, writeMutationCallbacks } from '@/lib/admin-mutations';

const KEY = ['admin-categories'];

export function useAdminCategories() {
  return useQuery({ queryKey: KEY, queryFn: adminCategoriesApi.list });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => adminCategoriesApi.create(input),
    ...writeMutationCallbacks(queryClient, [KEY], 'Đã thêm danh mục', 'Không thể thêm danh mục'),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      adminCategoriesApi.update(id, input),
    ...writeMutationCallbacks(
      queryClient,
      [KEY],
      'Đã cập nhật danh mục',
      'Không thể cập nhật danh mục',
    ),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCategoriesApi.remove(id),
    ...deleteMutationCallbacks(queryClient, KEY, 'Đã xoá danh mục', 'Không thể xoá danh mục'),
  });
}
