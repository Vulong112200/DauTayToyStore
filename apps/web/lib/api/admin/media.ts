import type { AdminMediaAsset, AdminMediaQuery, PaginatedResponse } from '@repo/contracts';
import { apiFetch, apiUpload } from '../../api-client';

function buildQueryString(query: Partial<AdminMediaQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminMediaApi = {
  list: (query: Partial<AdminMediaQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminMediaAsset>>(`/admin/media${buildQueryString(query)}`, {
      auth: true,
    }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiUpload<AdminMediaAsset>('/admin/media', formData);
  },

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
