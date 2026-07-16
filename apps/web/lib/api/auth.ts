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

export const authApi = {
  register: (input: RegisterInput) =>
    apiFetch<AuthResponse>('/auth/register', { body: input }),

  login: (input: LoginInput) => apiFetch<AuthResponse>('/auth/login', { body: input }),

  loginWithGoogle: (input: GoogleAuthInput) =>
    apiFetch<AuthResponse>('/auth/google', { body: input }),

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
