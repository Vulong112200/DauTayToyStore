import type {
  AdminInventoryItem,
  AdminInventoryQuery,
  PaginatedResponse,
  UpdateInventoryInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminInventoryQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminInventoryApi = {
  list: (query: Partial<AdminInventoryQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminInventoryItem>>(`/admin/inventory${buildQueryString(query)}`, {
      auth: true,
    }),

  update: (productId: string, input: UpdateInventoryInput) =>
    apiFetch<AdminInventoryItem>(`/admin/inventory/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),
};
