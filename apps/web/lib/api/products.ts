import type { PaginatedResponse, ProductDetail, ProductListItem, ProductListQuery } from '@repo/contracts';
import { apiFetch } from '../api-client';

function buildQueryString(query: Partial<ProductListQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const productsApi = {
  list: (query: Partial<ProductListQuery> = {}) =>
    apiFetch<PaginatedResponse<ProductListItem>>(`/products${buildQueryString(query)}`, {
      revalidateSeconds: 60,
    }),
  bySlug: (slug: string) =>
    apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { revalidateSeconds: 60 }),
};
