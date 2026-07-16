import type {
  AdminCoupon,
  AdminCouponQuery,
  CouponInput,
  PaginatedResponse,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminCouponQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminCouponsApi = {
  list: (query: Partial<AdminCouponQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminCoupon>>(`/admin/coupons${buildQueryString(query)}`, {
      auth: true,
    }),

  create: (input: CouponInput) =>
    apiFetch<AdminCoupon>('/admin/coupons', { body: input, auth: true }),

  update: (id: string, input: CouponInput) =>
    apiFetch<AdminCoupon>(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
