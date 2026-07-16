'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminBlogPostQuery, BlogPostInput } from '@repo/contracts';
import { adminBlogPostsApi } from '@/lib/api/admin/blog-posts';

const LIST_KEY = 'admin-blog-posts';

export function useAdminBlogPosts(query: Partial<AdminBlogPostQuery>) {
  return useQuery({
    queryKey: [LIST_KEY, query],
    queryFn: () => adminBlogPostsApi.list(query),
  });
}

export function useAdminBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-blog-post', id],
    queryFn: () => adminBlogPostsApi.getById(id as string),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogPostInput) => adminBlogPostsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BlogPostInput }) =>
      adminBlogPostsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBlogPostsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
