import type {
  AdminProductDetail,
  AdminProductListItem,
  AdminProductQuery,
  PaginatedResponse,
  ProductInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminProductQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminProductsApi = {
  list: (query: Partial<AdminProductQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminProductListItem>>(`/admin/products${buildQueryString(query)}`, {
      auth: true,
    }),

  getById: (id: string) =>
    apiFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`, { auth: true }),

  create: (input: ProductInput) =>
    apiFetch<AdminProductDetail>('/admin/products', { body: input, auth: true }),

  update: (id: string, input: ProductInput) =>
    apiFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
