import type { ContactMessageInput } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const contactApi = {
  submit: (input: ContactMessageInput) => apiFetch<{ success: true }>('/contact', { body: input }),
};
