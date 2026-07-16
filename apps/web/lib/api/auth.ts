import type {
  AuthResponse,
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserProfile,
} from '@repo/contracts';
import { apiFetch } from '../api-client';
import { getOrCreateCartSessionId } from '../cart-session';

/** Sent on register/login/Google-login so the API can merge any items added to the guest
 * cart (before signing in) into the account's own cart. */
function guestCartSessionHeaders(): Record<string, string> {
  return { 'x-cart-session': getOrCreateCartSessionId() };
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiFetch<AuthResponse>('/auth/register', { body: input, headers: guestCartSessionHeaders() }),

  login: (input: LoginInput) =>
    apiFetch<AuthResponse>('/auth/login', { body: input, headers: guestCartSessionHeaders() }),

  loginWithGoogle: (input: GoogleAuthInput) =>
    apiFetch<AuthResponse>('/auth/google', { body: input, headers: guestCartSessionHeaders() }),

  refresh: (refreshToken: string) =>
    apiFetch<AuthResponse>('/auth/refresh', { body: { refreshToken } }),

  logout: (refreshToken: string) =>
    apiFetch<{ success: true }>('/auth/logout', { body: { refreshToken } }),

  forgotPassword: (input: ForgotPasswordInput) =>
    apiFetch<{ success: true }>('/auth/forgot-password', { body: input }),

  resetPassword: (input: ResetPasswordInput) =>
    apiFetch<{ success: true }>('/auth/reset-password', { body: input }),

  me: () => apiFetch<UserProfile>('/auth/me', { method: 'GET', auth: true }),
};
