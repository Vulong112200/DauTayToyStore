import type { AdminBrand, BrandInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminBrandsApi = {
  list: () => apiFetch<AdminBrand[]>('/admin/brands', { auth: true }),

  create: (input: BrandInput) =>
    apiFetch<AdminBrand>('/admin/brands', { body: input, auth: true }),

  update: (id: string, input: BrandInput) =>
    apiFetch<AdminBrand>(`/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
