import type { AddressInput, AddressView } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const addressesApi = {
  list: () => apiFetch<AddressView[]>('/addresses', { auth: true }),

  create: (input: AddressInput) =>
    apiFetch<AddressView>('/addresses', { body: input, auth: true }),

  update: (id: string, input: AddressInput) =>
    apiFetch<AddressView>(`/addresses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/addresses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
