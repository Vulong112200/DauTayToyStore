import type { AdminComboDealDetail, AdminComboDealListItem, ComboDealInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminComboDealsApi = {
  list: () => apiFetch<AdminComboDealListItem[]>('/admin/combo-deals', { auth: true }),

  getById: (id: string) =>
    apiFetch<AdminComboDealDetail>(`/admin/combo-deals/${encodeURIComponent(id)}`, {
      auth: true,
    }),

  create: (input: ComboDealInput) =>
    apiFetch<AdminComboDealDetail>('/admin/combo-deals', { body: input, auth: true }),

  update: (id: string, input: ComboDealInput) =>
    apiFetch<AdminComboDealDetail>(`/admin/combo-deals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/combo-deals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
