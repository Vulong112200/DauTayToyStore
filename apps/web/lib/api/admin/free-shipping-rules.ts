import type { AdminFreeShippingRule, FreeShippingRuleInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminFreeShippingRulesApi = {
  list: () => apiFetch<AdminFreeShippingRule[]>('/admin/free-shipping-rules', { auth: true }),

  create: (input: FreeShippingRuleInput) =>
    apiFetch<AdminFreeShippingRule>('/admin/free-shipping-rules', { body: input, auth: true }),

  update: (id: string, input: FreeShippingRuleInput) =>
    apiFetch<AdminFreeShippingRule>(`/admin/free-shipping-rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/free-shipping-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
