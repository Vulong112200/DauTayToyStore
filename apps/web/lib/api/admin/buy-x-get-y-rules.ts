import type { AdminBuyXGetYRule, BuyXGetYRuleInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminBuyXGetYRulesApi = {
  list: () => apiFetch<AdminBuyXGetYRule[]>('/admin/buy-x-get-y-rules', { auth: true }),

  create: (input: BuyXGetYRuleInput) =>
    apiFetch<AdminBuyXGetYRule>('/admin/buy-x-get-y-rules', { body: input, auth: true }),

  update: (id: string, input: BuyXGetYRuleInput) =>
    apiFetch<AdminBuyXGetYRule>(`/admin/buy-x-get-y-rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/buy-x-get-y-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
