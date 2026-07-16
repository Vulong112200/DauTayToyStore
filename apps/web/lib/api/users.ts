import type { UpdateProfileInput, UserProfile } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const usersApi = {
  getMe: () => apiFetch<UserProfile>('/users/me', { auth: true }),

  updateMe: (input: UpdateProfileInput) =>
    apiFetch<UserProfile>('/users/me', { method: 'PATCH', body: input, auth: true }),
};
