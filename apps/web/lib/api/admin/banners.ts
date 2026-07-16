import type { AdminBanner, BannerInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminBannersApi = {
  list: () => apiFetch<AdminBanner[]>('/admin/banners', { auth: true }),

  create: (input: BannerInput) =>
    apiFetch<AdminBanner>('/admin/banners', { body: input, auth: true }),

  update: (id: string, input: BannerInput) =>
    apiFetch<AdminBanner>(`/admin/banners/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/banners/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
