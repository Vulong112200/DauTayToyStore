import type {
  AdminGiftVoucher,
  AdminGiftVoucherQuery,
  GiftVoucherInput,
  PaginatedResponse,
  UpdateGiftVoucherInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminGiftVoucherQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminGiftVouchersApi = {
  list: (query: Partial<AdminGiftVoucherQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminGiftVoucher>>(`/admin/gift-vouchers${buildQueryString(query)}`, {
      auth: true,
    }),

  create: (input: GiftVoucherInput) =>
    apiFetch<AdminGiftVoucher>('/admin/gift-vouchers', { body: input, auth: true }),

  update: (id: string, input: UpdateGiftVoucherInput) =>
    apiFetch<AdminGiftVoucher>(`/admin/gift-vouchers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/gift-vouchers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
