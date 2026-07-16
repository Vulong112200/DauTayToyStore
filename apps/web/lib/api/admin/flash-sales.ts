import type {
  AdminFlashSaleDetail,
  AdminFlashSaleListItem,
  FlashSaleInput,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminFlashSalesApi = {
  list: () => apiFetch<AdminFlashSaleListItem[]>('/admin/flash-sales', { auth: true }),

  getById: (id: string) =>
    apiFetch<AdminFlashSaleDetail>(`/admin/flash-sales/${encodeURIComponent(id)}`, {
      auth: true,
    }),

  create: (input: FlashSaleInput) =>
    apiFetch<AdminFlashSaleDetail>('/admin/flash-sales', { body: input, auth: true }),

  update: (id: string, input: FlashSaleInput) =>
    apiFetch<AdminFlashSaleDetail>(`/admin/flash-sales/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/flash-sales/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
