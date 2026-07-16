import type { FaqEntryView } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const faqApi = {
  list: () => apiFetch<FaqEntryView[]>('/faq', { revalidateSeconds: 300 }),
};
