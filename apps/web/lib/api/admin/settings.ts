import type { SiteSettings, UpdateSiteSettingsInput } from '@repo/contracts';
import { apiFetch } from '../../api-client';

export const adminSettingsApi = {
  get: () => apiFetch<SiteSettings>('/admin/settings', { auth: true }),

  update: (input: UpdateSiteSettingsInput) =>
    apiFetch<SiteSettings>('/admin/settings', { method: 'PATCH', body: input, auth: true }),
};
