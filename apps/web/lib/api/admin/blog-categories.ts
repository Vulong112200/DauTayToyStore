import type { AdminBlogCategory, BlogCategoryInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminBlogCategoriesApi = {
  list: () => apiFetch<AdminBlogCategory[]>('/admin/blog-categories', { auth: true }),

  create: (input: BlogCategoryInput) =>
    apiFetch<AdminBlogCategory>('/admin/blog-categories', { body: input, auth: true }),

  update: (id: string, input: BlogCategoryInput) =>
    apiFetch<AdminBlogCategory>(`/admin/blog-categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/blog-categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
