import type {
  AdminOrderListItem,
  AdminOrderQuery,
  OrderView,
  PaginatedResponse,
  UpdateOrderStatusInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminOrderQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminOrdersApi = {
  list: (query: Partial<AdminOrderQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminOrderListItem>>(`/admin/orders${buildQueryString(query)}`, {
      auth: true,
    }),

  getById: (id: string) =>
    apiFetch<OrderView>(`/admin/orders/${encodeURIComponent(id)}`, { auth: true }),

  updateStatus: (id: string, input: UpdateOrderStatusInput) =>
    apiFetch<OrderView>(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),
};
