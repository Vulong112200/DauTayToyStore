'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BlogCategoryInput } from '@repo/contracts';
import { adminBlogCategoriesApi } from '@/lib/api/admin/blog-categories';
import { deleteMutationCallbacks } from '@/lib/admin-mutations';

const LIST_KEY = 'admin-blog-categories';

export function useAdminBlogCategories() {
  return useQuery({ queryKey: [LIST_KEY], queryFn: () => adminBlogCategoriesApi.list() });
}

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogCategoryInput) => adminBlogCategoriesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BlogCategoryInput }) =>
      adminBlogCategoriesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBlogCategoriesApi.remove(id),
    ...deleteMutationCallbacks(
      queryClient,
      [LIST_KEY],
      'Đã xoá danh mục blog',
      'Không thể xoá danh mục blog',
    ),
  });
}
