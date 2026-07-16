import type { AdminCategory, CategoryInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminCategoriesApi = {
  list: () => apiFetch<AdminCategory[]>('/admin/categories', { auth: true }),

  create: (input: CategoryInput) =>
    apiFetch<AdminCategory>('/admin/categories', { body: input, auth: true }),

  update: (id: string, input: CategoryInput) =>
    apiFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
